const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PassportRegistry", function () {
  let registry;
  let admin, agency1, agency2, stranger;

  const TEST_DID      = "did:ethr:celo:0x1234567890abcdef";
  const TEST_DID_2    = "did:ethr:celo:0xabcdef1234567890";
  const PHONE         = "+977-9812345678";
  const PHONE_HASH    = ethers.keccak256(ethers.toUtf8Bytes(PHONE));
  const PHONE_2       = "+977-9811111111";
  const PHONE_HASH_2  = ethers.keccak256(ethers.toUtf8Bytes(PHONE_2));

  beforeEach(async function () {
    [admin, agency1, agency2, stranger] = await ethers.getSigners();

    const PassportRegistry = await ethers.getContractFactory("PassportRegistry");
    registry = await PassportRegistry.deploy(admin.address);

    // Register agency1
    await registry.connect(admin).registerAgency(agency1.address, "UNHCR Nepal");
    // Register agency2
    await registry.connect(admin).registerAgency(agency2.address, "WFP Pakistan");
  });

  describe("Agency Management", function () {
    it("registers an agency correctly", async function () {
      const agency = await registry.agencies(agency1.address);
      expect(agency.name).to.equal("UNHCR Nepal");
      expect(agency.active).to.equal(true);
    });

    it("prevents non-admin from registering agency", async function () {
      await expect(
        registry.connect(stranger).registerAgency(stranger.address, "Fake Agency")
      ).to.be.reverted;
    });

    it("revokes agency access", async function () {
      await registry.connect(admin).revokeAgency(agency1.address);
      const agency = await registry.agencies(agency1.address);
      expect(agency.active).to.equal(false);

      // Revoked agency cannot create passports
      await expect(
        registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3)
      ).to.be.reverted;
    });
  });

  describe("Passport Creation", function () {
    it("creates a passport successfully", async function () {
      await expect(
        registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3)
      )
        .to.emit(registry, "PassportCreated")
        .withArgs(TEST_DID, PHONE_HASH, agency1.address, anyValue);

      const passport = await registry.getPassport(TEST_DID);
      expect(passport.did).to.equal(TEST_DID);
      expect(passport.childrenCount).to.equal(3);
      expect(passport.createdByAgency).to.equal(agency1.address);
      expect(passport.exists).to.equal(true);
    });

    it("allows any registered agency to look up by phone hash", async function () {
      await registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3);

      // Agency 2 (different organization) can look up the same person
      const did = await registry.connect(agency2).getDidByPhone(PHONE_HASH);
      expect(did).to.equal(TEST_DID);
    });

    it("prevents duplicate DID", async function () {
      await registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3);
      await expect(
        registry.connect(agency1).createPassport(PHONE_HASH_2, TEST_DID, 2)
      ).to.be.revertedWith("Passport already exists");
    });

    it("prevents duplicate phone hash", async function () {
      await registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3);
      await expect(
        registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID_2, 2)
      ).to.be.revertedWith("Phone already registered");
    });

    it("tracks total passport count", async function () {
      expect(await registry.totalPassports()).to.equal(0);
      await registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3);
      expect(await registry.totalPassports()).to.equal(1);
      await registry.connect(agency2).createPassport(PHONE_HASH_2, TEST_DID_2, 2);
      expect(await registry.totalPassports()).to.equal(2);
    });

    it("prevents non-agency from creating passport", async function () {
      await expect(
        registry.connect(stranger).createPassport(PHONE_HASH, TEST_DID, 3)
      ).to.be.reverted;
    });
  });

  describe("Credential Issuance — The Cross-Agency Feature", function () {
    beforeEach(async function () {
      // Agency 1 creates the passport
      await registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3);
    });

    it("issues a credential from agency1", async function () {
      const ipfsHash = "QmXyz123abc";
      const validUntil = Math.floor(Date.now() / 1000) + 86400 * 365;

      await expect(
        registry.connect(agency1).issueCredential(
          TEST_DID,
          "FoodAssistanceEligibility",
          ipfsHash,
          validUntil
        )
      )
        .to.emit(registry, "CredentialIssued")
        .withArgs(TEST_DID, agency1.address, "FoodAssistanceEligibility", ipfsHash, anyValue);

      expect(await registry.getCredentialCount(TEST_DID)).to.equal(1);
    });

    it("allows DIFFERENT agency to issue credential — this is the protocol value", async function () {
      // Agency 1 created the passport, Agency 2 (different org) attaches their own credential
      await registry.connect(agency2).issueCredential(
        TEST_DID,
        "WFPFoodAssistance",
        "QmWFP456",
        Math.floor(Date.now() / 1000) + 86400 * 365
      );

      const creds = await registry.getCredentials(TEST_DID);
      expect(creds.length).to.equal(1);
      expect(creds[0].agencyAddress).to.equal(agency2.address);
      expect(creds[0].credentialType).to.equal("WFPFoodAssistance");
    });

    it("accumulates credentials from multiple agencies on one passport", async function () {
      // Both agencies issue credentials to the same passport
      await registry.connect(agency1).issueCredential(TEST_DID, "UNHCRVerification", "QmHCR111", 9999999999);
      await registry.connect(agency2).issueCredential(TEST_DID, "WFPFoodVoucher", "QmWFP222", 9999999999);

      const creds = await registry.getCredentials(TEST_DID);
      expect(creds.length).to.equal(2);
      expect(creds[0].agencyAddress).to.equal(agency1.address);
      expect(creds[1].agencyAddress).to.equal(agency2.address);
    });

    it("allows issuing agency to revoke their credential", async function () {
      await registry.connect(agency1).issueCredential(TEST_DID, "Test", "QmTest", 9999999999);
      await registry.connect(agency1).revokeCredential(TEST_DID, 0);

      const creds = await registry.getCredentials(TEST_DID);
      expect(creds[0].revoked).to.equal(true);
    });

    it("prevents agency from revoking another agency's credential", async function () {
      await registry.connect(agency1).issueCredential(TEST_DID, "Test", "QmTest", 9999999999);
      await expect(
        registry.connect(agency2).revokeCredential(TEST_DID, 0)
      ).to.be.revertedWith("Only issuing agency can revoke");
    });
  });

  describe("Pause functionality", function () {
    it("admin can pause and unpause", async function () {
      await registry.connect(admin).pause();
      await expect(
        registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3)
      ).to.be.reverted;

      await registry.connect(admin).unpause();
      await expect(
        registry.connect(agency1).createPassport(PHONE_HASH, TEST_DID, 3)
      ).to.not.be.reverted;
    });
  });
});

function anyValue() { return true; }
