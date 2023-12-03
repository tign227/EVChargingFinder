"use client";

import Head from "next/head";
import { useCallback, useEffect, useState, useRef } from "react";
import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import Swal from "sweetalert2";

import { StatonList as stations } from "@/public/station";
import { useWeb3 } from "../hooks/useWeb3";

const demoPos: [number, number] = [-0.127758, 51.507351];
const Home = () => {
  const mapRef = useRef<any>();
  const locateCurrentPosition = useCallback(async () => {
    const pos: GeolocationPosition = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 50000,
      });
    });

    setCurrentPos(pos);
  }, []);

  const loadMap = useCallback(async () => {
    // const tt = await import("@tomtom-international/web-sdk-maps");
    const apiKey = "nMq5c5JQxz8jjuwTEpo4YHYhZ7Lqlly3";
    const map = tt.map({
      key: apiKey,
      container: "mymap",
      center: demoPos,
      zoom: 14,
      interactive: true,
      stylesVisibility: {
        trafficFlow: false,
        trafficIncidents: false,
      },
    });
    var currPos = { lat: demoPos[1], lng: demoPos[0] };
    var marker = new tt.Marker().setLngLat(currPos).addTo(map);
    var popup = new tt.Popup({ anchor: "top", closeButton: false }).setText(
      "You"
    );
    marker.setPopup(popup).togglePopup();
    mapRef.current = map;
  }, []);

  const [currentPos, setCurrentPos] = useState<GeolocationPosition>();
  const {
    web3,
    walletAddress,
    hasConnectToWallet,
    reservationContract,
    accountContract,
    transaction,
    onConnect,
  } = useWeb3();

  const setStations = useCallback(async () => {
    // const tt = await import("@tomtom-international/web-sdk-maps");
    for (let i = 0; i < stations.length - 1; i++) {
      const currDistance = Math.sqrt(
        Math.pow(stations[i].lng - demoPos[0], 2) +
          Math.pow(stations[i].lat - demoPos[1], 2)
      );
      let minDistance = Number.MIN_SAFE_INTEGER,
        minPosition = 0;

      if (minDistance > currDistance) {
        minDistance = currDistance;
        minPosition = i;
      }
      const currStation = { lat: stations[i].lat, lng: stations[i].lng };
      let name = stations[i].name;
      let marker = new tt.Marker().setLngLat(currStation).addTo(mapRef.current);
      let popup = new tt.Popup({
        anchor: "top",
        closeButton: true,
      })
        .setText(stations[i].name)
        .setHTML(
          "<p>" +
            name +
            '</p><button id="reservation">Reservation</button><button id="pay">Pay Now</button>'
        );
      popup.on("open", (event) => {
        let user = walletAddress;
        let lat = 53.456;
        let lng = -11.43;
        const reservationUrl = `https://endpoint-dun.vercel.app/api/reservation?user=${user}&lat=${lat}&lng=${lng}`;
        const reservationPath = "message,reservationCode";
        document
          .getElementById("reservation")
          ?.addEventListener("click", async () => {
            try {
              if (!hasConnectToWallet) {
                Swal.fire({
                  title: "Warning!",
                  text: "Please connect to your wallet",
                  icon: "warning",
                  confirmButtonText: "OK",
                });
                return;
              }

              const network = "sepolia";
              const signer = web3.eth.accounts.privateKeyToAccount(
                "0x" +
                  "82d143e7fcd212b6e49ee9017d97e56e4a604eb0c67c3a3c46b8159f3e0299a2"
              );
              web3.eth.accounts.wallet.add(signer);
              const method_abi = reservationContract.methods
                .makeReservation()
                .encodeABI();
              const tx = {
                from: signer.address,
                to: "0xdC211bD05a035D2dcFB4D9628589d191c513E91F",
                data: method_abi,
                value: "0",
                gasPrice: "10000000000",
                gas: BigInt(0),
              };
              const gas_estimate = await web3.eth.estimateGas(tx);
              tx.gas = gas_estimate;
              const signedTx = await web3.eth.accounts.signTransaction(
                tx,
                signer.privateKey
              );
              // Sending the transaction to the network
              const receipt = await web3.eth
                .sendSignedTransaction(signedTx.rawTransaction)
                .once("transactionHash", (txhash) => {
                  console.log(`Mining transaction ...`);
                  console.log(`https://${network}.etherscan.io/tx/${txhash}`);
                });
              // The transaction is now on chain!
              console.log(`Mined in block ${receipt.blockNumber}`);
              const availables: Record<string, string> = {
                "2023-12-05": "09:00 AM - 12:00 PM",
                "2023-12-06": "02:00 PM - 05:00 PM",
                "2023-12-07": "10:30 AM - 01:30 PM",
              };

              Swal.fire({
                title: "Select Reservation Time",
                input: "select",
                inputOptions: availables,
                inputPlaceholder: "Select Reservation Time",
                showCancelButton: true,
                confirmButtonText: "Submit",
                allowOutsideClick: () => !Swal.isLoading(),
              }).then((result) => {
                if (result.isConfirmed) {
                  const selectedOption = availables[result.value];
                  Swal.fire({
                    title: `Reservation Time: \n${selectedOption}`,
                  });
                  console.log(walletAddress);
                  transaction(walletAddress, "", "0.0001");
                }
              });
            } catch (error) {
              console.error("Error calling reservationContract method:", error);
            }
          });

        const paymentUrl = "http://endpoint-dun.vercel.app/api/account";
        const paymentPath = "message,account";
        document.getElementById("pay")?.addEventListener("click", async () => {
          try {
            if (!hasConnectToWallet) {
              Swal.fire({
                title: "Warning!",
                text: "Please connect to your wallet",
                icon: "warning",
                confirmButtonText: "OK",
              });
              return;
            }
            await accountContract.methods.requestAccount().call();

            // Example with input
            // Example with an input field
            Swal.fire({
              title: "Input Amount",
              input: "text",
              inputPlaceholder: "Integer without decimal only",
              showCancelButton: true,
              confirmButtonText: "Submit",
              cancelButtonText: "Cancel",
              showLoaderOnConfirm: true,
              preConfirm: (value) => {
                // Handle the submitted value (e.g., send it to the server)
                return new Promise((resolve) => {
                  // Simulate an asynchronous request
                  setTimeout(() => {
                    if (
                      !Number.isInteger(parseInt(value)) ||
                      String(value).includes(".")
                    ) {
                      // Reject with an error message
                      Swal.showValidationMessage(
                        "Total amount is only integer"
                      );
                    }
                    resolve(value);
                  }, 300);
                });
              },
              allowOutsideClick: () => !Swal.isLoading(),
            }).then((result) => {
              if (result.isConfirmed) {
                // Handle the confirmed value
                Swal.fire("Toal amount: " + result.value);
                transaction(walletAddress, "", result.value as string);
              }
            });
          } catch (error) {
            console.error("Error calling accountRequest method:", error);
          }
        });
      });
      marker.setPopup(popup);
    }
  }, [
    hasConnectToWallet,
    walletAddress,
    accountContract,
    reservationContract,
    transaction,
    web3,
  ]);

  useEffect(() => {
    locateCurrentPosition();
  }, [locateCurrentPosition]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  useEffect(() => {
    setTimeout(() => {
      setStations();
    }, 1000);
  }, [setStations]);

  return (
    <div className="page-container">
      <Head>
        <title>First Post</title>
      </Head>

      <div className="info-container">
        <div>
          <p id="loc">
            Current Location:{" "}
            <span id="location">{`${demoPos[1]} N, ${demoPos[0]} E`}</span>
          </p>
          <p id="ev">
            Nearest EV Charging Station: <span id="station" />
          </p>
        </div>

        <button className="btn-connected" onClick={onConnect}>
          {walletAddress || "Connect"}
        </button>
      </div>

      <div id="mymap" className="map-container"></div>
    </div>
  );
};

export default Home;
