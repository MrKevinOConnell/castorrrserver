import axios from "axios";
import dotenv from "dotenv";
import { mnemonicToAccount } from "viem/accounts"; // Adjust the path if "viem/accounts" is a local file.

dotenv.config();

export const generate_signature = async function () {
  try {
    const createSignerResponse = await axios.post(
      "https://api.neynar.com/v2/farcaster/signer",
      {},
      {
        headers: {
          api_key: process.env.NEYNAR_API,
        },
      }
    );

    console.log(createSignerResponse.data);

    if (
      !createSignerResponse.data.public_key ||
      !createSignerResponse.data.signer_uuid
    ) {
      return null;
    }
    // DO NOT CHANGE ANY VALUES IN THIS CONSTANT
    const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: 10,
      verifyingContract:
        "0x00000000fc700472606ed4fa22623acf62c60553" as `0x${string}`,
    };

    // DO NOT CHANGE ANY VALUES IN THIS CONSTANT
    const SIGNED_KEY_REQUEST_TYPE = [
      { name: "requestFid", type: "uint256" },
      { name: "key", type: "bytes" },
      { name: "deadline", type: "uint256" },
    ];

    const account = mnemonicToAccount(process.env.app_phrase as string);

    // Generates an expiration date for the signature
    // e.g. 1693927665
    const deadline = Math.floor(Date.now() / 1000) + 31536000; // signature is valid for 1 year from now
    // You should pass the same value generated here into the POST /signer/signed-key Neynar API

    // Generates the signature
    const signature = await account.signTypedData({
      domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      types: {
        SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
      },
      primaryType: "SignedKeyRequest",
      message: {
        requestFid: BigInt(process.env.app_fid as string),
        key: createSignerResponse.data.public_key,
        deadline: BigInt(deadline),
      },
    });

    // Logging the deadline and signature to be used in the POST /signer/signed-key Neynar API
    return {
      deadline,
      signature,
      signer_uuid: createSignerResponse.data.signer_uuid,
    };
  } catch (error) {
    console.log(error);
    return { deadline: null, signature: null, signer_uuid: null };
  }
};
