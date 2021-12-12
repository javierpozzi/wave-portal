import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import "./App.css";
import wavePortalArtifact from "./artifacts/WavePortal.json";

export default function App() {
  const contractAddress = "0x794f1410381dCd19CA060EfFE21b2A61D485898D";
  const { ethereum } = window;
  const [currentAccount, setCurrentAccount] = useState("");
  const [message, setMessage] = useState("");
  const [disabledWaving, setDisabledWaving] = useState(false);
  const [miningWave, setMiningWave] = useState(false);
  const [totalWaves, setTotalWaves] = useState(null);
  const [allWaves, setAllWaves] = useState([]);

  const theme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
        getAllWaves();
        getTotalWaves();
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
      getAllWaves();
      getTotalWaves();
    } catch (error) {
      console.log(error);
    }
  };

  const getAllWaves = async () => {
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, signer);

        const waves = await wavePortalContract.getAllWaves();

        const reversedWaves = [...waves].reverse();

        const formattedWaves = reversedWaves.map((wave) => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          };
        });

        setAllWaves(formattedWaves);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getTotalWaves = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, signer);
      const totalWaves = await wavePortalContract.getTotalWaves();
      setTotalWaves(totalWaves.toNumber());
    } catch (error) {
      console.log(error);
    }
  };

  const wave = async () => {
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, signer);

        setDisabledWaving(true);
        const waveTxn = await wavePortalContract.wave(message);
        console.log("Mining...", waveTxn.hash);
        setMiningWave(true);

        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        setMiningWave(false);
        setDisabledWaving(false);

        setMessage("");

        getAllWaves();
        getTotalWaves();
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
      setMiningWave(false);
      setDisabledWaving(false);
    }
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <header className="App-header">
          <Box sx={{ p: 2 }}>
            <h1>Wave Portal</h1>
          </Box>
        </header>
        <div className="App-body">
          <div className="mainContainer">
            <div className="dataContainer">
              <div className="header">
                <span role="img" aria-label="Wave">
                  👋
                </span>
                Hey there!
              </div>

              <Box sx={{ p: 2 }}>
                <div className="bio">
                  I am Javier Pozzi! Connect your Ethereum wallet and wave at me! You could win some ether!
                </div>
              </Box>

              <TextField
                label="Send me a message!"
                variant="outlined"
                disabled={disabledWaving || miningWave}
                value={message}
                onChange={handleMessageChange}
                InputProps={{
                  inputProps: {
                    style: { justifyContent: "center", width: "100%" },
                  },
                }}
              />

              <Grid container justifyContent="center">
                <Box sx={{ p: 2 }}>
                  <Button variant="contained" onClick={wave} disabled={disabledWaving || miningWave}>
                    Wave at Me
                  </Button>
                </Box>
              </Grid>

              {!currentAccount && (
                <button className="waveButton" onClick={connectWallet}>
                  Connect Wallet
                </button>
              )}

              <Grid container justifyContent="flex-end">
                <div className="totalWaves">Total Waves: {totalWaves}</div>
              </Grid>

              {miningWave && (
                <Grid container justifyContent="center">
                  <Box sx={{ display: "flex", p: 2 }}>
                    <CircularProgress />
                  </Box>
                </Grid>
              )}

              <List>
                {allWaves.map((wave, index) => {
                  return (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={wave.address}
                        secondary={`${
                          wave.message
                        } - ${wave.timestamp.toLocaleDateString()} ${wave.timestamp.toLocaleTimeString()}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
