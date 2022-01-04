import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
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
  const contractAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  const rinkebyChainId = 31337;
  const { ethereum } = window;
  const provider = new ethers.providers.Web3Provider(ethereum);

  const [hasWallet, setHasWallet] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentNetworkIsRinkeby, setCurrentNetworkIsRinkeby] = useState(null);
  const [totalWaves, setTotalWaves] = useState(null);
  const [allWaves, setAllWaves] = useState([]);
  const [message, setMessage] = useState("");
  const [disabledWaving, setDisabledWaving] = useState(false);
  const [miningWave, setMiningWave] = useState(false);
  const [prizeSnackbarOpen, setPrizeSnackbarOpen] = useState(false);
  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
  const [prizeEarned, setPrizeEarned] = useState(null);

  let startBlockNumber;

  const theme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  const initState = async () => {
    try {
      if (!ethereum) {
        setHasWallet(false);
        return;
      }
      setHasWallet(true);
      checkConnectedAccount();
      listenToNetworkChange();
      listenToAccountsChange();
      listenToContractEvents();
    } catch (error) {
      console.log(error);
    }
  };

  const checkConnectedAccount = async () => {
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account);
        getAllWaves();
        getTotalWaves();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const listenToNetworkChange = async () => {
    try {
      // The "any" network will allow spontaneous network changes
      const providerAnyNetwork = new ethers.providers.Web3Provider(ethereum, "any");
      providerAnyNetwork.on("network", (newNetwork, oldNetwork) => {
        setCurrentNetworkIsRinkeby(newNetwork.chainId === rinkebyChainId);

        // When a Provider makes its initial connection, it emits a "network"
        // event with a null oldNetwork along with the newNetwork. So, if the
        // oldNetwork exists, it represents a changing network.
        if (oldNetwork) {
          // The best practice when a network change occurs is to simply refresh the page.
          window.location.reload();
        }
      });
    } catch (error) {
      console.log(error);
    }
  };

  const listenToAccountsChange = async () => {
    try {
      ethereum.on("accountsChanged", (_) => {
        // The best practice when an account change occurs is to simply refresh the page.
        // This also consider when an account is first connected.
        window.location.reload();
      });
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const getAllWaves = async () => {
    try {
      const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, provider.getSigner());
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
    } catch (error) {
      console.log(error);
    }
  };

  const getTotalWaves = async () => {
    try {
      const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, provider.getSigner());
      const totalWaves = await wavePortalContract.getTotalWaves();
      setTotalWaves(totalWaves.toNumber());
    } catch (error) {
      console.log(error);
    }
  };

  const wave = async () => {
    try {
      const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, provider.getSigner());
      setDisabledWaving(true);
      const waveTxn = await wavePortalContract.wave(message, { gasLimit: 300000 });
      setMiningWave(true);
      await waveTxn.wait();
      setMessage("");
    } catch (error) {
      console.log(error);
      setErrorSnackbarOpen(true);
    } finally {
      setMiningWave(false);
      setDisabledWaving(false);
    }
  };

  const listenToContractEvents = async () => {
    try {
      const wavePortalContract = new ethers.Contract(contractAddress, wavePortalArtifact.abi, provider.getSigner());
      startBlockNumber = await provider.getBlockNumber();
      wavePortalContract.on("NewWave", onNewWave);
      wavePortalContract.on("PrizeEarned", onPrizeEarned);
    } catch (error) {
      console.log(error);
    }
  };

  const onNewWave = (from, timestamp, message, event) => {
    if (event.blockNumber <= startBlockNumber) {
      return;
    }

    setAllWaves((prevState) => [
      {
        address: from,
        timestamp: new Date(timestamp * 1000),
        message: message,
      },
      ...prevState,
    ]);
    setTotalWaves((prevState) => prevState + 1);
  };

  const onPrizeEarned = async (winner, __, value, event) => {
    if (event.blockNumber <= startBlockNumber) {
      return;
    }

    const accounts = await provider.listAccounts();

    if (accounts.length === 0 || winner.toLowerCase() !== accounts[0].toLowerCase()) {
      return;
    }
    setPrizeEarned(ethers.utils.formatEther(value.toNumber()));
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

  useEffect(initState, []);

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
        <Container className="App-body">
          <div className="mainContainer">
            <div className="dataContainer">
              <div className="header">
                <span role="img" aria-label="Wave">
                  👋
                </span>
                Hey there!
              </div>

              <Box sx={{ p: 2 }}>
                <Typography className="bio">
                  I am Javier Pozzi! Connect your Ethereum wallet and wave at me! You could win some ether!
                </Typography>
              </Box>

              {!hasWallet && (
                <Card sx={{ minWidth: 275, my: 5 }}>
                  <CardContent sx={{ backgroundColor: "red" }}>
                    <Typography sx={{ mt: 1.5, textAlign: "center" }} variant="body2">
                      No wallet found. Please install a wallet like MetaMask to continue.
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {currentAccount && currentNetworkIsRinkeby === false && (
                <Card sx={{ minWidth: 275, my: 5 }}>
                  <CardContent sx={{ backgroundColor: "red" }}>
                    <Typography sx={{ mt: 1.5, textAlign: "center" }} variant="body2">
                      Please switch to the Rinkeby testnet to use Wave Portal.
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {currentAccount &&
                currentNetworkIsRinkeby && [
                  <TextField
                    key="messageField"
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
                  />,
                  <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                    Wave with address {currentAccount}
                  </Typography>,
                  <Grid container justifyContent="center">
                    <Box sx={{ p: 2 }}>
                      <Button
                        variant="contained"
                        onClick={wave}
                        disabled={disabledWaving || miningWave || message.length === 0}
                      >
                        Wave at Me
                      </Button>
                    </Box>
                  </Grid>,
                ]}

              {!currentAccount && (
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
                        secondary={`${truncateAddress(
                          wave.address
                        )} - ${wave.timestamp.toLocaleDateString()} ${wave.timestamp.toLocaleTimeString()}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
              <Card sx={{ minWidth: 275, my: 5 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <img
                      className="buildspaceLogo"
                      alt="buildspace logo"
                      src="https://api.typedream.com/v0/document/public/f71c1437-09d6-45e9-a6e8-3f18592cc3ef_image-removebg-preview_1_png.png"
                    />
                    <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                      buildspace
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 1.5 }} variant="body2">
                    Wave Portal is part of the project "Build a Web3 App with Solidity + Ethereum Smart Contracts" of
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
        </Container>
      </div>
    </ThemeProvider>
  );
}
