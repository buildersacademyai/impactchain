const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OracleCore", function () {
  let oracle;
  let admin, agency1, oracleService, stranger;

  const ONE_CUSD = ethers.parseUnits("1", 18);
  const FIVE_CUSD = ethers.parseUnits("5", 18);

  beforeEach(async function () {
    [admin, agency1, oracleService, stranger] = await ethers.getSigners();

    const OracleCore = await ethers.getContractFactory("OracleCore");
    oracle = await OracleCore.deploy(admin.address);

    // Register agency1 and a dedicated oracle service account
    await oracle.connect(admin).registerAgency(agency1.address);
    await oracle.connect(admin).registerOracleService(oracleService.address);
  });

  // ─── deployOracle ───────────────────────────────────────────────────────────

  describe("deployOracle()", function () {
    it("deploys an oracle config", async function () {
      await oracle.connect(agency1).deployOracle(
        "Flood Alert Sindhupalchok",
        "OCHA_HDX",
        ">= 0.8",
        ONE_CUSD,
        "Sindhupalchok",
        3600
      );

      const cfg = await oracle.getOracle(0);
      expect(cfg.name).to.equal("Flood Alert Sindhupalchok");
      expect(cfg.dataSource).to.equal("OCHA_HDX");
      expect(cfg.condition).to.equal(">= 0.8");
      expect(cfg.disburseCusd).to.equal(ONE_CUSD);
      expect(cfg.scopeDistrict).to.equal("Sindhupalchok");
      expect(cfg.checkIntervalSec).to.equal(3600);
      expect(cfg.agencyAddress).to.equal(agency1.address);
      expect(cfg.active).to.equal(true);
      expect(cfg.triggerCount).to.equal(0);
    });

    it("emits OracleDeployed event", async function () {
      await expect(
        oracle.connect(agency1).deployOracle("Flood", "OCHA_HDX", ">= 0.8", ONE_CUSD, "Kathmandu", 3600)
      ).to.emit(oracle, "OracleDeployed")
        .withArgs(0, "Flood", agency1.address, ONE_CUSD);
    });

    it("increments oracle count", async function () {
      await oracle.connect(agency1).deployOracle("A", "USGS", "> 5", ONE_CUSD, "Kaski", 1800);
      await oracle.connect(agency1).deployOracle("B", "UNHCR", "> 100", FIVE_CUSD, "Banke", 3600);
      expect(await oracle.totalOracles()).to.equal(2);
    });

    it("reverts with zero disbursement amount", async function () {
      await expect(
        oracle.connect(agency1).deployOracle("Bad Oracle", "OCHA_HDX", "> 0", 0, "Kaski", 3600)
      ).to.be.revertedWith("Disburse amount required");
    });

    it("reverts with empty name", async function () {
      await expect(
        oracle.connect(agency1).deployOracle("", "OCHA_HDX", "> 0", ONE_CUSD, "Kaski", 3600)
      ).to.be.revertedWith("Name required");
    });

    it("reverts for non-agency", async function () {
      await expect(
        oracle.connect(stranger).deployOracle("X", "OCHA_HDX", "> 0", ONE_CUSD, "Kaski", 3600)
      ).to.be.reverted;
    });
  });

  // ─── triggerOracle ──────────────────────────────────────────────────────────

  describe("triggerOracle()", function () {
    beforeEach(async function () {
      await oracle.connect(agency1).deployOracle(
        "Flood Alert", "OCHA_HDX", ">= 0.8", ONE_CUSD, "Sindhupalchok", 3600
      );
    });

    it("records trigger event on-chain", async function () {
      await oracle.connect(oracleService).triggerOracle(0, 50, "0.92");

      const evt = await oracle.getTriggerEvent(0);
      expect(evt.oracleId).to.equal(0);
      expect(evt.familiesAffected).to.equal(50);
      expect(evt.totalDisbursed).to.equal(ONE_CUSD * 50n);
      expect(evt.dataValue).to.equal("0.92");
      expect(evt.triggeredBy).to.equal(oracleService.address);
    });

    it("increments trigger count on config", async function () {
      await oracle.connect(oracleService).triggerOracle(0, 10, "0.85");
      await oracle.connect(oracleService).triggerOracle(0, 5, "0.91");
      const cfg = await oracle.getOracle(0);
      expect(cfg.triggerCount).to.equal(2);
    });

    it("emits OracleTriggered event", async function () {
      await expect(oracle.connect(oracleService).triggerOracle(0, 20, "0.88"))
        .to.emit(oracle, "OracleTriggered")
        .withArgs(0, 20, ONE_CUSD * 20n, "0.88", await latestTimestamp() + 1);
    });

    it("admin can trigger manually", async function () {
      await expect(oracle.connect(admin).triggerOracle(0, 1, "manual"))
        .to.emit(oracle, "OracleTriggered");
    });

    it("reverts for stranger without ORACLE_ROLE", async function () {
      await expect(oracle.connect(stranger).triggerOracle(0, 1, "0.8")).to.be.reverted;
    });

    it("reverts with zero families affected", async function () {
      await expect(
        oracle.connect(oracleService).triggerOracle(0, 0, "0.9")
      ).to.be.revertedWith("No families affected");
    });

    it("reverts on invalid oracle ID", async function () {
      await expect(
        oracle.connect(oracleService).triggerOracle(99, 1, "0.9")
      ).to.be.revertedWith("Oracle not found");
    });

    it("reverts if oracle is deactivated", async function () {
      await oracle.connect(agency1).deactivateOracle(0);
      await expect(
        oracle.connect(oracleService).triggerOracle(0, 1, "0.9")
      ).to.be.revertedWith("Oracle not active");
    });
  });

  // ─── deactivateOracle ───────────────────────────────────────────────────────

  describe("deactivateOracle()", function () {
    beforeEach(async function () {
      await oracle.connect(agency1).deployOracle(
        "Flood Alert", "OCHA_HDX", ">= 0.8", ONE_CUSD, "Sindhupalchok", 3600
      );
    });

    it("owning agency can deactivate", async function () {
      await oracle.connect(agency1).deactivateOracle(0);
      const cfg = await oracle.getOracle(0);
      expect(cfg.active).to.equal(false);
    });

    it("admin can deactivate any oracle", async function () {
      await oracle.connect(admin).deactivateOracle(0);
      const cfg = await oracle.getOracle(0);
      expect(cfg.active).to.equal(false);
    });

    it("emits OracleDeactivated event", async function () {
      await expect(oracle.connect(agency1).deactivateOracle(0))
        .to.emit(oracle, "OracleDeactivated")
        .withArgs(0);
    });

    it("stranger cannot deactivate another agency's oracle", async function () {
      await expect(oracle.connect(stranger).deactivateOracle(0)).to.be.reverted;
    });
  });

  // ─── View functions ─────────────────────────────────────────────────────────

  describe("view functions", function () {
    it("totalOracles and totalTriggers start at 0", async function () {
      expect(await oracle.totalOracles()).to.equal(0);
      expect(await oracle.totalTriggers()).to.equal(0);
    });

    it("getTriggerEvent reverts on out-of-bounds", async function () {
      await expect(oracle.getTriggerEvent(0)).to.be.revertedWith("Index out of bounds");
    });

    it("getOracle reverts on invalid id", async function () {
      await expect(oracle.getOracle(99)).to.be.revertedWith("Oracle not found");
    });
  });

  // ─── Pause ──────────────────────────────────────────────────────────────────

  describe("pause / unpause", function () {
    it("admin can pause and block deployOracle", async function () {
      await oracle.connect(admin).pause();
      await expect(
        oracle.connect(agency1).deployOracle("X", "OCHA_HDX", "> 0", ONE_CUSD, "Kaski", 3600)
      ).to.be.reverted;
    });

    it("stranger cannot pause", async function () {
      await expect(oracle.connect(stranger).pause()).to.be.reverted;
    });
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}