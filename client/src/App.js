import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import CssBaseline from "@mui/material/CssBaseline";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ethers } from "ethers";
import * as React from "react";
import { useEffect, useState } from "react";
import Identicon from "react-identicons";
import "./App.css";
import wavePortalArtifact from "./artifacts-json/WavePortal.json";

export default function App() {
  // TODO: Refactor contractAddress and chainId with .env
  const contractAddress = "0x699F31453abf3443c321FD88a32a9349d23C3d44";
  const rinkebyChainId = 4;
  const { ethereum } = window;
  const [currentAccount, setCurrentAccount] = useState(null);
  const [totalWaves, setTotalWaves] = useState(null);
  const [allWaves, setAllWaves] = useState([]);
  const [message, setMessage] = useState("");
  const [disabledWaving, setDisabledWaving] = useState(false);
  const [miningWave, setMiningWave] = useState(false);
  const [prizeSnackbarOpen, setPrizeSnackbarOpen] = useState(false);
  const [prizeEarned, setPrizeEarned] = useState(null);
  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
  const [currentNetworkIsRinkeby, setCurrentNetworkIsRinkeby] = useState(false);

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

  const listenToNetworkChange = async () => {
    try {
      if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      // The "any" network will allow spontaneous network changes
      const provider = new ethers.providers.Web3Provider(ethereum, "any");
      provider.on("network", (newNetwork, oldNetwork) => {
        setCurrentNetworkIsRinkeby(newNetwork.chainId === rinkebyChainId);

        // When a Provider makes its initial connection, it emits a "network"
        // event with a null oldNetwork along with the newNetwork. So, if the
        // oldNetwork exists, it represents a changing network.
        if (oldNetwork && newNetwork.chainId === rinkebyChainId && oldNetwork.chainId !== newNetwork.chainId) {
          // The best practice when a network change occurs is to simply refresh the page.
          window.location.reload();
        }
      });
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
        const waveTxn = await wavePortalContract.wave(message, { gasLimit: 300000 });
        console.log("Mining...", waveTxn.hash);
        setMiningWave(true);

        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        setMiningWave(false);
        setDisabledWaving(false);

        setMessage("");

        // TODO: Refactor with events
        getAllWaves();
        getTotalWaves();
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
      setErrorSnackbarOpen(true);
      setMiningWave(false);
      setDisabledWaving(false);
    }
  };

  const onNewWave = (from, timestamp, message) => {
    setAllWaves((prevState) => [
      ...prevState,
      {
        address: from,
        timestamp: new Date(timestamp * 1000),
        message: message,
      },
    ]);
    setTotalWaves((prevState) => prevState + 1);
  };

  const onPrizeEarned = (winner, __, value) => {
    if (winner !== currentAccount) {
      return;
    }
    setPrizeEarned(value.toNumber());
    setPrizeSnackbarOpen(true);
  };

  const truncateAddress = (address) => {
    return address.substring(0, 6) + "..." + address.substring(address.length - 4);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handlePrizeSnackbarClose = (_, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setPrizeSnackbarOpen(false);
  };

  const handleErrorSnackbarClose = (_, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setErrorSnackbarOpen(false);
  };

  useEffect(() => {
    let wavePortalContract;

    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, signer);
      wavePortalContract.on("NewWave", onNewWave);
      wavePortalContract.on("PrizeEarned", onPrizeEarned);
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
        wavePortalContract.off("PrizeEarned", onPrizeEarned);
      }
    };
  }, []);

  useEffect(() => {
    checkIfWalletIsConnected();
    listenToNetworkChange();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Snackbar open={prizeSnackbarOpen} autoHideDuration={6000} onClose={handlePrizeSnackbarClose}>
        <Alert onClose={handlePrizeSnackbarClose} severity="success" sx={{ width: "100%" }}>
          Congratulations! You have won {prizeEarned} ETH! Check your wallet.
        </Alert>
      </Snackbar>
      <Snackbar open={errorSnackbarOpen} autoHideDuration={6000} onClose={handleErrorSnackbarClose}>
        <Alert onClose={handleErrorSnackbarClose} severity="error" sx={{ width: "100%" }}>
          An error occurred. If you recently send a wave, please wait a few minutes and try again.
        </Alert>
      </Snackbar>
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

              {currentAccount && !currentNetworkIsRinkeby && (
                <Box sx={{ p: 2 }}>
                  <div className="bio">Please switch to the Rinkeby testnet to use the dApp.</div>
                </Box>
              )}

              {currentAccount && currentNetworkIsRinkeby && (
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
              )}

              {currentAccount && currentNetworkIsRinkeby && (
                <Grid container justifyContent="center">
                  <Box sx={{ p: 2 }}>
                    <Button variant="contained" onClick={wave} disabled={disabledWaving || miningWave}>
                      Wave at Me
                    </Button>
                  </Box>
                </Grid>
              )}

              {!currentAccount && currentNetworkIsRinkeby && (
                <Grid container justifyContent="center">
                  <Box sx={{ p: 2 }}>
                    <Button variant="contained" onClick={connectWallet}>
                      Connect Wallet
                    </Button>
                  </Box>
                </Grid>
              )}

              {currentAccount && currentNetworkIsRinkeby && (
                <Grid container justifyContent="flex-end">
                  <div className="totalWaves">Total Waves: {totalWaves}</div>
                </Grid>
              )}

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
                        <Identicon string={wave.address} size="30" />
                      </ListItemAvatar>
                      <ListItemText
                        primary={wave.message}
                        secondary={`${
                          truncateAddress(wave.address)
                        } - ${wave.timestamp.toLocaleDateString()} ${wave.timestamp.toLocaleTimeString()}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
              <Card sx={{ minWidth: 275, my: 5 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <img
                      class="buildspaceLogo"
                      src="https://api.typedream.com/v0/document/public/f71c1437-09d6-45e9-a6e8-3f18592cc3ef_image-removebg-preview_1_png.png"
                    />
                    <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                      buildspace
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 1.5 }} variant="body2">
                    This dApp is part of the project "Build a Web3 App with Solidity + Ethereum Smart Contracts" of
                    buildspace
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => {
                      window.location.href = "https://buildspace.so/";
                    }}
                  >
                    Learn More
                  </Button>
                </CardActions>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
