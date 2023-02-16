import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("OwnableWithTimelock", function () {

  async function deploySimpleToken() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [account1, account2] = await ethers.getSigners();

    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.deploy(1000);

    return { simpleToken, account1, account2 };
  }

  describe("Deployment", function () {
    it("Should set the Owner to account1", async function () {
      const { simpleToken, account1 } = await loadFixture(deploySimpleToken);
      expect(await simpleToken.owner() ).to.equal(account1.address);      
    });
    it("Should set the default TimeLock to 0x0, 365 days, end of time", async function () {
      const { simpleToken, account1 } = await loadFixture(deploySimpleToken);

      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(ethers.constants.AddressZero);
      expect(delay).to.equal(365 * 24 * 60 * 60);
      expect(timestamp).to.equal(0);
    });
  });
  describe("Timelock setup", function () {
    it("SetOwnerTimelock to account2, 100 days", async function () {
      const { simpleToken, account1, account2 } = await loadFixture(deploySimpleToken);
      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*100);
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.equal(0);
    });
    it("SetOwnerTimelock to account2, 100 days then 120 days", async function () {
      const { simpleToken, account1, account2 } = await loadFixture(deploySimpleToken);
      
      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*100);
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.equal(0);

      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*120);
      const [addr1, delay1, timestamp1 ] = await simpleToken.getOwnerTimelock();
      expect(addr1).to.equal(account2.address);
      expect(delay1).to.equal(120 * 24 * 60 * 60);
      expect(timestamp1).to.equal(0);
    });
  });
  describe("Event emissions", function () {
    it("Checking TimeLockInitiated", async function () {
      const { simpleToken, account1, account2 } = await loadFixture(deploySimpleToken);
      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*100);
      await expect( simpleToken.connect(account2).initOwnerUnlock() )
          .to.emit(simpleToken, "TimelockInitiated")
          .withArgs(account2.address);
    });
    it("Checking TimelockCanceled", async function () {
      const { simpleToken, account1, account2 } = await loadFixture(deploySimpleToken);
      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*100);
      await simpleToken.connect(account2).initOwnerUnlock()
      await expect( simpleToken.cancelOwnerUnlock() )
          .to.emit(simpleToken, "TimelockCanceled");
    });
  });
  describe("Scenario #1", function () {
    var simpleToken, account1, account2  ;
    const now = Math.floor(Date.now() / 1000);
    it("Deploy Token - owner is account1", async function () {
      const ret = await loadFixture(deploySimpleToken);
      simpleToken = ret.simpleToken;
      account1 = ret.account1;
      account2 = ret.account2;
      expect(await simpleToken.owner() ).to.equal(account1.address);      
    });
    it("initOwnerUnlock by account2 is denied.", async function () {
      await expect(simpleToken.initOwnerUnlock() ).to.be.revertedWith("Address denied");
    });
    it("setOwnerTimelock( account2, 100 days )", async function () {
      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*100);
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.equal(0);
    });
    it("initOwnerUnlock by account2 is successfull", async function () {
      await simpleToken.connect(account2).initOwnerUnlock();
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.be.closeTo(now, 10); // 10 seconds diff accepted
    });
    it("+00 days - completeOwnerUnlock by account2 is is denied: Not yet", async function () {
      await expect(simpleToken.connect(account2).completeOwnerUnlock() ).to.be.revertedWith("Not yet");
    });
    it("+50 days - completeOwnerUnlock by account2 is is denied: Not yet", async function () {
      await time.increaseTo(now + 60*60*24*50);
      await expect(simpleToken.connect(account2).completeOwnerUnlock() ).to.be.revertedWith("Not yet");
    });
    it("+101 days - completeOwnerUnlock by account2 is succesfull.", async function () {
      await time.increaseTo(now + 60*60*24*101);
      //await simpleToken.connect(account2).completeOwnerUnlock();
      
      await expect( simpleToken.connect(account2).completeOwnerUnlock() )
          .to.emit(simpleToken, "OwnershipTransferred")
          .withArgs(account1.address, account2.address);
    });
    it("Token owner is account2.", async function () {
      expect(await simpleToken.owner() ).to.equal(account2.address);
    });
  });
  describe("Scenario #2", function () {
    var simpleToken, account1, account2  ;
    const now = Math.floor(Date.now() / 1000);
    it("Deploy Token - owner is account1", async function () {
      const ret = await loadFixture(deploySimpleToken);
      simpleToken = ret.simpleToken;
      account1 = ret.account1;
      account2 = ret.account2;
      expect(await simpleToken.owner() ).to.equal(account1.address);      
    });
    it("setOwnerTimelock( account2, 100 days )", async function () {
      await simpleToken.setOwnerTimelock(account2.address, 60*60*24*100);
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.equal(0);
    });
    it("initOwnerUnlock by account2 is successfull", async function () {
      await simpleToken.connect(account2).initOwnerUnlock();
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.be.closeTo(now, 10); // 10 seconds diff accepted
    });
    it("+00 days - completeOwnerUnlock by account2 is is denied: Not yet", async function () {
      await expect(simpleToken.connect(account2).completeOwnerUnlock() ).to.be.revertedWith("Not yet");
    });
    it("+50 days - completeOwnerUnlock by account2 is is denied: Not yet", async function () {
      await time.increaseTo(now + 60*60*24*50);
      await expect(simpleToken.connect(account2).completeOwnerUnlock() ).to.be.revertedWith("Not yet");
    });
    it("+50 days - account1 CANCELS transfer", async function () {
      await simpleToken.cancelOwnerUnlock();
      const [addr, delay, timestamp ] = await simpleToken.getOwnerTimelock();
      expect(addr).to.equal(account2.address);
      expect(delay).to.equal(100 * 24 * 60 * 60);
      expect(timestamp).to.equal(0);
    });
    it("+101 days - completeOwnerUnlock by account2 fails.", async function () {
      await time.increaseTo(now + 60*60*24*101);
      await expect(simpleToken.connect(account2).completeOwnerUnlock() ).to.be.revertedWith("Not initialized");
    });
    it("Token owner is account1. (no transfer)", async function () {
      expect(await simpleToken.owner() ).to.equal(account1.address);
    });
  });
});
