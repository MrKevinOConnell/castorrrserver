import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import { generate_signature } from "./utils";

const app = express();
const PORT = 4000;

const API_URL = "https://api.neynar.com/v2/farcaster/feed/";

dotenv.config();
app.use(cors());
app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/get_channel", async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;

  if (!url) return res.status(400).json({ ok: false, message: "Missing url" });

  const parent_url = url.endsWith("/") ? url.slice(0, -1) : url;
  console.log(parent_url); // "https://www.nba.com"

  const cursor = req.query.cursor || (null as string | null);
  try {
    let params = {
      api_key: process.env.NEYNAR_API as string,
      filter_type: "parent_url",
      parent_url,
      feed_type: "filter",
    } as any;
    if (cursor) {
      params = { ...params, cursor };
    }

    const response = await axios.get(API_URL, {
      params,
    });
    // console.log(response.data);

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).send("Error fetching data");
  }
});

app.post("/create_signer", async (req, res) => {
  try {
    const { deadline, signature, signer_uuid } =
      (await generate_signature()) as any;
    if (!deadline || !signature || !signer_uuid) {
      res.status(500).json({ error: "error generating" });
      return;
    }

    const signedKeyResponse = await axios.post(
      "https://api.neynar.com/v2/farcaster/signer/signed_key",
      {
        signer_uuid,
        app_fid: process.env.app_fid,
        deadline,
        signature,
      },
      {
        headers: {
          api_key: process.env.NEYNAR_API,
        },
      }
    );
    res.status(200).json(signedKeyResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/get_signer", async (req, res) => {
  try {
    console.log(req.query);
    if (!req.query.signer_uuid) {
      res.status(400).json({ error: "Missing signer_uuid" });
    }
    const response = await axios.get(
      "https://api.neynar.com/v2/farcaster/signer",
      {
        params: req.query,
        headers: {
          api_key: process.env.NEYNAR_API,
        },
      }
    );
    console.log("get_signer", response.data);
    let data = response.data;
    if (data.status === "approved") {
      let fid = data.fid;

      // Second Axios call based on the cURL command
      const secondResponse = await axios.get(
        "https://api.neynar.com/v1/farcaster/user/",
        {
          params: {
            api_key: process.env.NEYNAR_API,
            fid,
          },
        }
      );

      console.log("farcaster/user", secondResponse.data);

      // Extracting the user object from the second response
      const user = {
        username: secondResponse.data.result.user.username,
        displayName: secondResponse.data.result.user.displayName,
        pfpURL: secondResponse.data.result.user.pfp.url,
      };
      data = { ...data, user };
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/create_cast", async (req, res) => {
  try {
    console.log("body is", req.body);
    const response = await axios.post(
      "https://api.neynar.com/v2/farcaster/cast",
      req.body,
      {
        headers: {
          api_key: process.env.NEYNAR_API,
        },
      }
    );
    console.log("create_cast", response.data);
    res.json({ ok: true, data: response.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
