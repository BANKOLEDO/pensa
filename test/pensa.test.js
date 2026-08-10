const { expect } = require("chai");
const { ethers } = require("hardhat");

const USDC6 = (n) => ethers.parseUnits(String(n), 6);

describe("PENSAVault", function () {
  let vault, deployer, user, factory, token;

  beforeEach(async function () {
    [deployer, user, factory] = await ethers.getSigners();

    const PENSAVault = await ethers.getContractFactory("PENSAVault");
    const impl = await PENSAVault.deploy();
    await impl.waitForDeployment();

    // factory is signer[2]; init with user as owner, factory as the trusted singleton
    await (await impl.connect(factory).initialize(user.address, 300, [], 50, factory.address)).wait();
    vault = impl;

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("USD", "USD", 6, USDC6(1_000_000));
    await token.waitForDeployment();
  });

  it("initializes with allocation and risk", async function () {
    expect(await vault.allocationPercent()).to.equal(300);
    expect(await vault.riskTolerance()).to.equal(50);
    expect(await vault.user()).to.equal(user.address);
    expect(await vault.factory()).to.equal(factory.address);
  });

  it("reverts on double initialization", async function () {
    await expect(vault.initialize(user.address, 300, [], 50, factory.address)).to.be.revertedWith(
      "PENSA: Already initialized"
    );
  });

  it("rejects allocation above 10%", async function () {
    await expect(vault.connect(user).updateAllocation(1001)).to.be.revertedWith("PENSA: Max 10%");
  });

  it("only the user can withdraw", async function () {
    const attacker = await (await ethers.getSigners())[4];
    await expect(vault.connect(attacker).withdraw(token.target, 1)).to.be.revertedWith("PENSA: Only user");
  });

  it("deposits record holdings and totals", async function () {
    const amount = USDC6(100);
    await token.connect(deployer).transfer(user.address, amount);
    await token.connect(user).approve(vault.target, amount);
    await vault.connect(user).deposit(token.target, amount);

    const [assets, balances] = await vault.getHoldings();
    expect(balances[0]).to.equal(amount);
    expect(await vault.totalDeposited()).to.equal(amount);
    expect(await vault.getTotalValue()).to.equal(amount);
    expect(assets[0]).to.equal(token.target);
  });

  it("factory can record returns and notify deposits", async function () {
    const returns = USDC6(5);
    await vault.connect(factory).recordReturns(returns);
    expect(await vault.totalReturns()).to.equal(returns);
  });

  it("user can withdraw their deposit", async function () {
    const amount = USDC6(50);
    await token.connect(deployer).transfer(user.address, amount);
    await token.connect(user).approve(vault.target, amount);
    await vault.connect(user).deposit(token.target, amount);
    await vault.connect(user).withdraw(token.target, amount);
    expect(await token.balanceOf(user.address)).to.equal(amount);
    const [, balances] = await vault.getHoldings();
    expect(balances[0]).to.equal(0);
  });
});

describe("PENSAFactory", function () {
  let factory, token, deployer, user;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();

    const PENSAVault = await ethers.getContractFactory("PENSAVault");
    const vaultImpl = await PENSAVault.deploy();
    await vaultImpl.waitForDeployment();

    const PENSAFactory = await ethers.getContractFactory("PENSAFactory");
    factory = await PENSAFactory.deploy(await vaultImpl.getAddress(), deployer.address);
    await factory.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("PENSA Dollar", "PUSD", 6, USDC6(1_000_000));
    await token.waitForDeployment();
  });

  it("deploys a working clone vault via createVault", async function () {
    await (await factory.connect(user).createVault(300, [token.target], 50)).wait();
    const vault = await factory.getUserVault(user.address);
    expect(vault).to.not.equal(ethers.ZeroAddress);

    const v = await ethers.getContractAt("PENSAVault", vault);
    expect(await v.user()).to.equal(user.address);
    expect(await v.allocationPercent()).to.equal(300);
    expect(await v.riskTolerance()).to.equal(50);
    expect(await v.factory()).to.equal(await factory.getAddress());
    expect(await factory.vaultCount()).to.equal(1);
  });

  it("prevents a second vault per user", async function () {
    await (await factory.connect(user).createVault(300, [token.target], 50)).wait();
    await expect(factory.connect(user).createVault(300, [token.target], 50)).to.be.revertedWith(
      "PENSA: Vault already exists"
    );
  });

  it("forwards a payment capturing only the allocation percent", async function () {
    await (await factory.connect(user).createVault(300, [token.target], 50)).wait();
    const vault = await factory.getUserVault(user.address);

    const pay = USDC6(1000); // $1,000 payout -> 3% = $30
    const alloc = USDC6(30);
    await token.connect(deployer).transfer(user.address, pay);
    await token.connect(user).approve(await factory.getAddress(), pay);
    await (await factory.connect(user).forwardPayment(user.address, token.target, pay)).wait();

    const v = await ethers.getContractAt("PENSAVault", vault);
    expect(await v.totalDeposited()).to.equal(alloc);
    expect(await token.balanceOf(vault)).to.equal(alloc);
  });

  it("reverts forwarding when there is no vault", async function () {
    await expect(factory.connect(user).forwardPayment(user.address, token.target, USDC6(10))).to.be.revertedWith(
      "PENSA: No vault for user"
    );
  });

  it("reverts forwarding with zero allocation", async function () {
    await (await factory.connect(user).createVault(300, [token.target], 50)).wait();
    await token.connect(deployer).transfer(user.address, USDC6(10));
    await token.connect(user).approve(await factory.getAddress(), USDC6(10));
    await expect(factory.connect(user).forwardPayment(user.address, token.target, 1)).to.be.revertedWith(
      "PENSA: Allocation is zero"
    );
  });

  it("owner can record returns and update allocation via factory", async function () {
    await (await factory.connect(user).createVault(300, [token.target], 50)).wait();
    const vault = await factory.getUserVault(user.address);

    await (await factory.recordReturns(user.address, USDC6(7))).wait();
    await (await factory.connect(user).updateAllocation(500)).wait();

    const v = await ethers.getContractAt("PENSAVault", vault);
    expect(await v.totalReturns()).to.equal(USDC6(7));
    expect(await v.allocationPercent()).to.equal(500);
  });

  it("collects the protocol fee from returns only", async function () {
    const [, u, feeBeneficiary] = await ethers.getSigners();
    const PENSAFactory = await ethers.getContractFactory("PENSAFactory");
    const f2 = await PENSAFactory.deploy(await factory.vaultImplementation(), feeBeneficiary.address);
    await f2.waitForDeployment();

    await (await f2.connect(u).createVault(300, [token.target], 50)).wait();
    const vault = await f2.getUserVault(u.address);

    const v = await ethers.getContractAt("PENSAVault", vault);
    const deposit = USDC6(1000);
    await token.connect(deployer).transfer(u.address, deposit);
    await token.connect(u).approve(v.target, deposit);
    await v.connect(u).deposit(token.target, deposit);
    await (await f2.recordReturns(u.address, USDC6(100))).wait(); // $100 returns

    await f2.collectFee(vault); // 50 bps of returns = $0.50
    expect(await token.balanceOf(feeBeneficiary.address)).to.equal((USDC6(100) * 50n) / 10000n);
  });

  it("on-chain strategy update stores a hash on the vault", async function () {
    await (await factory.connect(user).createVault(300, [token.target], 50)).wait();
    const vault = await factory.getUserVault(user.address);
    const h = ethers.keccak256(ethers.toUtf8Bytes("PENSA-balanced-2026"));
    await (await factory.connect(user).updateStrategy(h)).wait();
    const v = await ethers.getContractAt("PENSAVault", vault);
    expect(await v.currentStrategyHash()).to.equal(h);
  });

  it("rejects non-owner admin calls", async function () {
    await expect(factory.connect(user).setProtocolFee(1000)).to.be.revertedWith("PENSA: Not owner");
    await expect(factory.connect(user).updateImplementation(ethers.ZeroAddress)).to.be.revertedWith("PENSA: Not owner");
  });
});

describe("PENSAStrategy", function () {
  it("registers a strategy with weights summing to 100%", async function () {
    const [deployer, agent] = await ethers.getSigners();
    const PENSAStrategy = await ethers.getContractFactory("PENSAStrategy");
    const s = await PENSAStrategy.deploy(agent.address);
    await s.waitForDeployment();

    const id = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const assets = [deployer.address, deployer.address, deployer.address];
    const weights = [4000, 3000, 3000];
    await expect(s.connect(agent).registerStrategy(id, assets, weights))
      .to.emit(s, "StrategyRegistered")
      .withArgs(id, agent.address);

    expect(await s.strategyCount()).to.equal(1);
    const stored = await s.getStrategy(id);
    expect(stored.totalBasisPoints).to.equal(10000);
    expect(stored.active).to.equal(true);
    expect(stored.allocations.length).to.equal(3);
  });

  it("rejects weights that do not sum to 100%", async function () {
    const [deployer] = await ethers.getSigners();
    const PENSAStrategy = await ethers.getContractFactory("PENSAStrategy");
    const s = await PENSAStrategy.deploy(deployer.address);
    await s.waitForDeployment();

    const id = ethers.keccak256(ethers.toUtf8Bytes("bad"));
    await expect(s.connect(deployer).registerStrategy(id, [deployer.address], [5000])).to.be.revertedWith(
      "PENSA: Weights must sum to 100%"
    );
    await expect(s.connect(deployer).registerStrategy(id, [deployer.address], [0])).to.be.revertedWith(
      "PENSA: Zero weight"
    );
  });

  it("allows only owner/agent to register and owner to deactivate", async function () {
    const [deployer, agent, other] = await ethers.getSigners();
    const PENSAStrategy = await ethers.getContractFactory("PENSAStrategy");
    const s = await PENSAStrategy.deploy(agent.address); // deployer=owner, agent=signer2
    await s.waitForDeployment();

    const id = ethers.keccak256(ethers.toUtf8Bytes("auth"));
    await expect(s.connect(other).registerStrategy(id, [deployer.address], [10000])).to.be.revertedWith(
      "PENSA: Unauthorized"
    );
    await expect(s.connect(other).deactivateStrategy(id)).to.be.revertedWith("PENSA: Not owner");

    await (await s.connect(agent).registerStrategy(id, [deployer.address], [10000])).wait();
    await (await s.connect(deployer).deactivateStrategy(id)).wait();
    expect((await s.getStrategy(id)).active).to.equal(false);
  });

  it("rejects duplicate strategy ids", async function () {
    const [deployer] = await ethers.getSigners();
    const PENSAStrategy = await ethers.getContractFactory("PENSAStrategy");
    const s = await PENSAStrategy.deploy(deployer.address);
    await s.waitForDeployment();

    const id = ethers.keccak256(ethers.toUtf8Bytes("dup"));
    await (await s.connect(deployer).registerStrategy(id, [deployer.address], [10000])).wait();
    await expect(s.connect(deployer).registerStrategy(id, [deployer.address], [10000])).to.be.revertedWith(
      "PENSA: Already exists"
    );
  });
});

describe("MockERC20", function () {
  it("mints to the deployer and transfers", async function () {
    const [deployer, other] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("PUSD", "PUSD", 6, USDC6(1_000_000));
    await token.waitForDeployment();
    expect(await token.balanceOf(deployer.address)).to.equal(USDC6(1_000_000));
    await token.transfer(other.address, USDC6(100));
    expect(await token.balanceOf(other.address)).to.equal(USDC6(100));
  });
});