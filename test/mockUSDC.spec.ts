import { expect } from "chai";
import { ethers } from "hardhat";
import type { MockUSDC } from "../typechain/contracts/tokens/MockUSDC";

describe("MockUSDC", () => {
  it("mints initial supply to owner and keeps 6 decimals", async () => {
    const [owner] = await ethers.getSigners();
    const token = (await ethers.deployContract("MockUSDC", [owner.address])) as unknown as MockUSDC;
    await token.waitForDeployment();

    const initialSupply = ethers.parseUnits("1000000", 6);

    expect(await token.decimals()).to.equal(6);
    expect(await token.totalSupply()).to.equal(initialSupply);
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
  });

  it("allows owner minting and user transfers", async () => {
    const [owner, user] = await ethers.getSigners();
    const token = (await ethers.deployContract("MockUSDC", [owner.address])) as unknown as MockUSDC;
    await token.waitForDeployment();

    const initialSupply = ethers.parseUnits("1000000", 6);
    const mintAmount = ethers.parseUnits("1000", 6);
    const transferAmount = ethers.parseUnits("100", 6);

    await token.mint(user.address, mintAmount);

    expect(await token.balanceOf(user.address)).to.equal(mintAmount);
    await token.connect(user).transfer(owner.address, transferAmount);

    const expectedOwnerBalance = initialSupply + transferAmount;
    const expectedUserBalance = mintAmount - transferAmount;

    expect(await token.balanceOf(owner.address)).to.equal(expectedOwnerBalance);
    expect(await token.balanceOf(user.address)).to.equal(expectedUserBalance);
  });
});
