const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Disburse", function () {
  let disburse, mockCUSD, registry;
  let admin, agency1, agency2, beneficiary, stranger;

  const ONE_CUSD   = ethers.parseUnits("1", 18);
  const TEN_CUSD   = ethers.parseUnits("10", 18);
  const TEST_DID   = "did:ethr:celo:0x1234567890abcdef";
  const TEST_DID_2 = "did:ethr:celo:0xabcdef1234567890";

  beforeEach(async function () {
    [admin, agency1, agency2, beneficiary, stranger] = await ethers.getSigners();

    // Deploy mock cUSD
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockCUSD = await MockERC20.deploy("Celo Dollar", "cUSD");

    // Deploy PassportRegistry (needed by Disburse constructor)
    const PassportRegistry = await ethers.getContractFactory("PassportRegistry");
    registry = await PassportRegistry.deploy(admin.address);

    // Deploy Disburse
    const Disburse = await ethers.getContractFactory("Disburse");
    disburse = await Disburse.deploy(
      admin.address,
      await mockCUSD.getAddress(),
      await registry.getAddress()
    );

    // Register agency1 in Disburse
    await disburse.connect(admin).registerAgency(agency1.address);

    // Mint cUSD to agency1 and approve Disburse
    await mockCUSD.mint(agency1.address, TEN_CUSD);
    await mockCUSD.connect(agency1).approve(await disburse.getAddress(), TEN_CUSD);
  });

  // ─── Deposit ────────────────────────────────────────────────────────────────

  describe("deposit()", function () {
    it("agency can deposit cUSD", async function () {
      await disburse.connect(agency1).deposit(TEN_CUSD);
      expect(await disburse.agencyBalances(agency1.address)).to.equal(TEN_CUSD);
    });

    it("emits Deposited event", async function () {
      await expect(disburse.connect(agency1).deposit(TEN_CUSD))
        .to.emit(disburse, "Deposited")
        .withArgs(agency1.address, TEN_CUSD);
    });

    it("reverts on zero amount", async function () {
      await expect(disburse.connect(agency1).deposit(0))
        .to.be.revertedWith("Amount must be > 0");
    });

    it("reverts for non-agency", async function () {
      await expect(disburse.connect(stranger).deposit(ONE_CUSD)).to.be.reverted;
    });
  });

  // ─── Disburse ───────────────────────────────────────────────────────────────

  describe("disburse()", function () {
    beforeEach(async function () {
      await disburse.connect(agency1).deposit(TEN_CUSD);
    });

    it("disburses cUSD to beneficiary", async function () {
      const before = await mockCUSD.balanceOf(beneficiary.address);
      await disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "food_voucher");
      const after = await mockCUSD.balanceOf(beneficiary.address);
      expect(after - before).to.equal(ONE_CUSD);
    });

    it("deducts from agency balance", async function () {
      await disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "food_voucher");
      const remaining = TEN_CUSD - ONE_CUSD;
      expect(await disburse.agencyBalances(agency1.address)).to.equal(remaining);
    });

    it("tracks totalDisbursedToDid", async function () {
      await disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "food_voucher");
      await disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "second");
      expect(await disburse.totalDisbursedToDid(TEST_DID))
        .to.equal(ONE_CUSD * 2n);
    });

    it("emits Disbursed event", async function () {
      await expect(
        disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "food_voucher")
      ).to.emit(disburse, "Disbursed")
        .withArgs(TEST_DID, beneficiary.address, agency1.address, ONE_CUSD, "food_voucher", await latestTimestamp());
    });

    it("reverts on insufficient balance", async function () {
      const tooMuch = ethers.parseUnits("100", 18);
      await expect(
        disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, tooMuch, "x")
      ).to.be.revertedWith("Insufficient agency balance");
    });

    it("reverts with zero address recipient", async function () {
      await expect(
        disburse.connect(agency1).disburse(TEST_DID, ethers.ZeroAddress, ONE_CUSD, "x")
      ).to.be.revertedWith("Invalid recipient");
    });

    it("reverts with zero amount", async function () {
      await expect(
        disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, 0, "x")
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("reverts for non-agency", async function () {
      await expect(
        disburse.connect(stranger).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "x")
      ).to.be.reverted;
    });
  });

  // ─── View Functions ─────────────────────────────────────────────────────────

  describe("view functions", function () {
    beforeEach(async function () {
      await disburse.connect(agency1).deposit(TEN_CUSD);
      await disburse.connect(agency1).disburse(TEST_DID, beneficiary.address, ONE_CUSD, "food");
      await disburse.connect(agency1).disburse(TEST_DID_2, beneficiary.address, ONE_CUSD, "shelter");
    });

    it("totalDisbursements returns correct count", async function () {
      expect(await disburse.totalDisbursements()).to.equal(2);
    });

    it("getDisbursement returns correct record", async function () {
      const rec = await disburse.getDisbursement(0);
      expect(rec.did).to.equal(TEST_DID);
      expect(rec.agency).to.equal(agency1.address);
      expect(rec.amount).to.equal(ONE_CUSD);
      expect(rec.reason).to.equal("food");
    });

    it("getDisbursement reverts on out-of-bounds", async function () {
      await expect(disburse.getDisbursement(99)).to.be.revertedWith("Index out of bounds");
    });

    it("totalDisbursedAllTime sums all amounts", async function () {
      expect(await disburse.totalDisbursedAllTime()).to.equal(ONE_CUSD * 2n);
    });
  });

  // ─── Withdraw ───────────────────────────────────────────────────────────────

  describe("withdraw()", function () {
    beforeEach(async function () {
      await disburse.connect(agency1).deposit(TEN_CUSD);
    });

    it("agency can withdraw unspent balance", async function () {
      const before = await mockCUSD.balanceOf(agency1.address);
      await disburse.connect(agency1).withdraw(ONE_CUSD);
      const after = await mockCUSD.balanceOf(agency1.address);
      expect(after - before).to.equal(ONE_CUSD);
    });

    it("emits Withdrawn event", async function () {
      await expect(disburse.connect(agency1).withdraw(ONE_CUSD))
        .to.emit(disburse, "Withdrawn")
        .withArgs(agency1.address, ONE_CUSD);
    });

    it("reverts on insufficient balance", async function () {
      await expect(
        disburse.connect(agency1).withdraw(ethers.parseUnits("100", 18))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  // ─── Pause ──────────────────────────────────────────────────────────────────

  describe("pause / unpause", function () {
    it("admin can pause and unpause", async function () {
      await disburse.connect(admin).pause();
      await mockCUSD.connect(agency1).approve(await disburse.getAddress(), TEN_CUSD);
      await expect(disburse.connect(agency1).deposit(ONE_CUSD)).to.be.reverted;
      await disburse.connect(admin).unpause();
      await disburse.connect(agency1).deposit(ONE_CUSD); // should succeed
    });

    it("stranger cannot pause", async function () {
      await expect(disburse.connect(stranger).pause()).to.be.reverted;
    });
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}