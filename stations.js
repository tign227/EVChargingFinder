const locateCurrentPosition = () =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currLoc = [-0.127758, 51.507351];
        resolve(position);
      },
      (error) => {
        console.log(error.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 50000,
      }
    );
  });

locateCurrentPosition().then((position) => {
  document.getElementById("location").innerHTML =
    currLoc[1] + " N, " + currLoc[0] + " E";
});

let apikey = "nMq5c5JQxz8jjuwTEpo4YHYhZ7Lqlly3";
let map;
let minDistance = Number.MAX_SAFE_INTEGER;
let minPosition = Number.MAX_SAFE_INTEGER;
locateCurrentPosition()
  .then((position) => {
    map = tt.map({
      key: apikey,
      container: "mymap",
      center: currLoc,
      zoom: 14,
      interactive: true,
      style: {
        map: "basic_main",
      },
      stylesVisibility: {
        trafficFlow: false,
        trafficIncidents: false,
      },
    });
    var currPos = { lat: currLoc[1], lng: currLoc[0] };
    var marker = new tt.Marker().setLngLat(currPos).addTo(map);
    var popup = new tt.Popup({ anchor: "top", closeButton: false }).setText(
      "You"
    );
    marker.setPopup(popup).togglePopup();
  })
  .then(() => {
    serviceContract.events
      .RequestCompleted({
        filter: { _requestType: ["Reservation", "Account"] },
      })
      .on("data", (event) => {
        if (event.returnValues._requestType === "Reservation") {
          console.log(
            "reservation data received =>",
            event.returnValues._result
          );
          reservationCode = event.returnValues._result;
          Swal.fire({
            title: `Reservation Time: \n${selectedOption} \n Reservation Code: \n${reservationCode} \n Station formation: \n${stationName} ${latTemp} ${lngTemp}`,
          });
          Swal.fire({
            title: "Reservation Information",
            html:
              '<div class="reservation-popup">' +
              "<p>Reservation Time:" +
              selectedOption +
              "</p>" +
              "<p>Reservation Code: " +
              reservationCode +
              "</p>" +
              "<p>Station Information:<br>station name: " +
              stationName +
              "<br>latitude: " +
              latTemp +
              "<br>longitude: " +
              lngTemp +
              "</p>" +
              "</div>",
            customClass: {
              popup: "reservation-popup-container", // 弹窗容器的样式
            },
            confirmButtonText: "Confirm",
            showConfirmButton: true,
          });
        } else if (event.returnValues._requestType === "Account") {
          console.log("account data received =>", event.returnValues._result);
          accountResponse = event.returnValues._result;
          Swal.fire("Toal amount: " + paymentAmount);
          transaction(walletAddress, accountResponse, paymentAmount);
        }
      })
      .on("changed", (changed) => console.log("changed data => ", changed))
      .on("connected", (str) => console.log("connected build => ", str));
    for (i = 0; i < stations.length - 1; i++) {
      currDistance = Math.sqrt(
        Math.pow(stations[i].lng - currLoc[0], 2) +
          Math.pow(stations[i].lat - currLoc[1], 2)
      );
      if (minDistance > currDistance) {
        minDistance = currDistance;
        minPosition = i;
      }
      currStation = { lat: stations[i].lat, lng: stations[i].lng };
      let name = stations[i].name;
      let lat = stations[i].lat;
      let lng = stations[i].lng;
      let marker = new tt.Marker({ interactive: true })
        .setLngLat(currStation)
        .addTo(map);
      let popup = new tt.Popup({
        anchor: "top",
        closeButton: true,
        interactive: true,
      })
        .setText(stations[i].name)
        .setHTML(
          "<p>" +
            name +
            '</p><button id="reservation">Reservation</button><button id="pay">Pay Now</button>'
        );
      popup.on("open", (event) => {
        let user = walletAddress;
        latTemp = lat;
        lngTemp = lng;
        stationName = name;
        const reservationUrl = `https://endpoint-dun.vercel.app/api/reservation?user=${user}&lat=${latTemp}&lng=${lngTemp}`;
        const reservationPath = "message,reservationCode";

        const paymentUrl = `http://endpoint-dun.vercel.app/api/account?user=${user}&station=${name}`;
        const paymentPath = "message,account";

        document
          .getElementById("reservation")
          .addEventListener("click", async () => {
            try {
              if (!hasConnectToWallet()) {
                Swal.fire({
                  title: "Warning!",
                  text: "Please connect to your wallet",
                  icon: "warning",
                  confirmButtonText: "OK",
                });
                return;
              }

              const availables = {
                "2023-12-05": "09:00 AM - 12:00 PM",
                "2023-12-06": "02:00 PM - 05:00 PM",
                "2023-12-07": "10:30 AM - 01:30 PM",
              };

              const web3 = new Web3(window.ethereum);
              const gasPriceForReservation = await web3.eth.getGasPrice();
              const gasEstimateReservation = await reservationContract.methods
                .makeReservation(reservationUrl, reservationPath)
                .estimateGas({ from: walletAddress });

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
                  window.ethereum
                    .enable()
                    .then(function (accounts) {
                      const methodAbiForReservation =
                        reservationContract.methods
                          .makeReservation(reservationUrl, reservationPath)
                          .encodeABI();

                      //reservation
                      web3.eth
                        .sendTransaction({
                          from: walletAddress,
                          to: reservationAddress,
                          data: methodAbiForReservation,
                          gas: gasEstimateReservation,
                          gasPrice: gasPriceForReservation,
                        })
                        .then((receipt) => {
                          console.log("Transaction receipt:", receipt);
                        })
                        .catch((error) => {
                          console.error("Error sending transaction:", error);
                        });
                    })
                    .catch(function (error) {
                      // 用户拒绝了连接到以太坊网络的授权请求
                      console.error("User denied account access");
                    });
                  selectedOption = availables[result.value];
                }
              });
            } catch (error) {
              console.error("Error calling reservationContract method:", error);
            }
          });

        document.getElementById("pay").addEventListener("click", async () => {
          try {
            if (!hasConnectToWallet()) {
              Swal.fire({
                title: "Warning!",
                text: "Please connect to your wallet",
                icon: "warning",
                confirmButtonText: "OK",
              });
              return;
            }
            const web3 = new Web3(window.ethereum);
            const gasEstimateAccount = await accountContract.methods
              .requestAccount(paymentUrl, paymentPath)
              .estimateGas({ from: walletAddress });
            const gasPriceForAccount = await web3.eth.getGasPrice();
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
                window.ethereum
                  .enable()
                  .then(function (accounts) {
                    const methodAbiforAccount = accountContract.methods
                      .requestAccount(paymentUrl, paymentPath)
                      .encodeABI();

                    //account request
                    web3.eth
                      .sendTransaction({
                        from: walletAddress,
                        to: accountAddress,
                        data: methodAbiforAccount,
                        gas: gasEstimateAccount,
                        gasPrice: gasPriceForAccount,
                      })
                      .then((receipt) => {
                        console.log("Transaction receipt:", receipt);
                      })
                      .catch((error) => {
                        console.error("Error sending transaction:", error);
                      });
                  })
                  .catch(function (error) {
                    // 用户拒绝了连接到以太坊网络的授权请求
                    console.error("User denied account access");
                  });
                paymentAmount = result.value;
              }
            });
          } catch (error) {
            console.error("Error calling accountRequest method:", error);
          }
        });
      });
      marker.setPopup(popup);
    }

    document.getElementById("station").innerHTML =
      " " + stations[minPosition].name;
  });

// CV STATION SEQUENCE FOR WEB3 PAYMENT
let stations = [
  {
    lng: -0.13676,
    lat: 51.507354,
    name: "Sarada Road, Kolkata",
  },
  { lng: -0.14676, lat: 51.507354, name: "Bhubaneswar" },
  { lng: -0.13276, lat: 51.511089, name: "Barrackpore" },
  { lng: -0.13276, lat: 51.11089, name: "New Town, Kolkata" },
  {
    lng: 88.3916758855774,
    lat: 22.60846519471392,
    name: "Khudiram Bose, Kolkata",
  },
  { lng: 87.05652096301246, lat: 23.664663295419654, name: "Asansol" },
  { lng: 87.81269270154024, lat: 23.273091713247492, name: "Bardhamann" },
  { lng: 87.33730401504803, lat: 22.367995285288448, name: "Kharagpur" },
  { lng: 88.3730678490928, lat: 26.72991554622295, name: "Matigara, Siliguri" },
  {
    lng: 88.43008251504111,
    lat: 26.732107383205754,
    name: "Sevoke Road, Siliguri",
  },
  { lng: 89.48272431503251, lat: 26.323415983384812, name: "Cooch Behar" },
  { lng: 86.43945331498323, lat: 23.848550984541056, name: "Dhanbad" },
  { lng: 86.07083531497973, lat: 23.664729984631748, name: "Bokaro" },
  { lng: 86.14497421496353, lat: 22.79070388507095, name: "Jamshedpur" },
  { lng: 85.04440231501789, lat: 25.612639983704682, name: "Danapur, Patna" },
  {
    lng: 85.25646631501705,
    lat: 25.571197983723646,
    name: "Deedarganj, Patna",
  },
  { lng: 84.93005901508694, lat: 24.52532538421312, name: "Bodh Gaya" },
  { lng: 84.82957331490462, lat: 19.29898798696034, name: "Baharampur" },
  { lng: 85.7765033271771, lat: 20.26048438028324, name: "Bhubaneswar" },
  {
    lng: 83.18465931674318,
    lat: 17.684248500223962,
    name: "Vishweshwaraya, Vishakhapatnam",
  },
  {
    lng: 83.2900122301142,
    lat: 17.713222781912688,
    name: "Allipuram, Vishakhapatnam",
  },
  {
    lng: 83.31233926914882,
    lat: 17.725293340659714,
    name: "Rock Park, Vishakhapatnam",
  },
  {
    lng: 83.29354251488117,
    lat: 17.727626987875556,
    name: "Dondaparthy, Vishakhapatnam",
  },
  {
    lng: 83.22616691488125,
    lat: 17.73392998787177,
    name: "Airport Road, Vishakhapatnam",
  },
  { lng: 79.57479751487303, lat: 17.15064938822087, name: "Suryapet" },
  { lng: 79.16455851487386, lat: 17.21287698818339, name: "Narketpally" },
  { lng: 80.64135403592857, lat: 16.452564485143522, name: "Vijaywada" },
  { lng: 81.79814746967465, lat: 16.983130729643605, name: "Rajahmudry" },
  {
    lng: 78.54444731487584,
    lat: 17.35265698809938,
    name: "Saroornagar, Hyderabad",
  },
  {
    lng: 78.55528131487605,
    lat: 17.36489998809216,
    name: "Alkapuri, Hyderabad",
  },
  { lng: 78.55701643288904, lat: 17.37714062483567, name: "Nagole, Hyderabad" },
  {
    lng: 78.50588931487648,
    lat: 17.400594988070758,
    name: "Vidyanagar, Hyderabad",
  },
  {
    lng: 78.50322839327164,
    lat: 17.440815675845542,
    name: "Shivaji Nagar, Hyderabad",
  },
  { lng: 78.57496131487767, lat: 17.48080998802269, name: "ECIL, Hyderabad" },
  {
    lng: 78.45410431497191,
    lat: 17.429948988053084,
    name: "Somajiguda, Hyderabad",
  },
  {
    lng: 78.43238631487723,
    lat: 17.45439798803855,
    name: "Vikaspuri, Hyderabad",
  },
  {
    lng: 78.3529845748316,
    lat: 17.490335068125606,
    name: "Hafeezpet, Hyderabad",
  },
  {
    lng: 78.38115131487721,
    lat: 17.453449988039015,
    name: "Madhapur, Hyderabad",
  },
  { lng: 80.19365041481849, lat: 12.63251379107904, name: "Mahabalipuram" },
  {
    lng: 80.1738143148218,
    lat: 12.950257990869922,
    name: "Pallavaram, Chennai",
  },
  {
    lng: 80.21865371482241,
    lat: 13.006897490832708,
    name: "Velachery, Chennai",
  },
  {
    lng: 80.25309631482261,
    lat: 13.033654990815206,
    name: "Alwarpet, Chennai",
  },
  {
    lng: 80.25465066940063,
    lat: 13.046617306601995,
    name: "Gopalapuram, Chennai",
  },
  {
    lng: 80.20723519930074,
    lat: 13.049948539127188,
    name: "Vadapalani, Chennai",
  },
  {
    lng: 80.19991131482315,
    lat: 13.0765599907871,
    name: "Arumbakkam, Chennai",
  },
  {
    lng: 80.12426341491974,
    lat: 13.04167349080993,
    name: "Goparasanallur, Chennai",
  },
  { lng: 79.8004446149086, lat: 11.89454559156879, name: "Puducherry" },
  { lng: 79.19886396441676, lat: 12.945179716045939, name: "Vellore" },
  { lng: 78.12378751480905, lat: 11.683118791710228, name: "Salem" },
  { lng: 77.93456785428765, lat: 11.519522515342212, name: "Salem Toll" },
  { lng: 78.68287311489907, lat: 10.824072292289205, name: "Trichy" },
  { lng: 78.02225951669251, lat: 9.863802123814585, name: "Madurai" },
  {
    lng: 77.43977931480465,
    lat: 11.213021992026151,
    name: "Vadamugam, Coimbatore",
  },
  {
    lng: 77.05559951480326,
    lat: 11.050158292136135,
    name: "Chinniyampalayam, Coimbatore",
  },
  {
    lng: 76.97434291480275,
    lat: 10.998400892171132,
    name: "Race Course, Coimbatore",
  },
  {
    lng: 76.95880518834603,
    lat: 11.009001828946259,
    name: "Brookefields, Coimbatore",
  },
  {
    lng: 76.86239088545605,
    lat: 10.85594806419762,
    name: "Walayar, Coimbatore",
  },
  { lng: 76.66773510834649, lat: 10.769843867684141, name: "Pallakad" },
  { lng: 76.70094721480659, lat: 11.420143191886686, name: "Ooty" },
  {
    lng: 76.18738511479869,
    lat: 10.540591692481845,
    name: "Punkunnam, Thrissur",
  },
  {
    lng: 76.21467657511815,
    lat: 10.539403898160435,
    name: "Patturaikkal, Thrissur",
  },
  { lng: 76.7067106729961, lat: 9.892191175449149, name: "Thodupuzha" },
  { lng: 76.31573351479356, lat: 9.923707392903527, name: "Nettoor, Kochi" },
  { lng: 76.29254962239668, lat: 9.944706145739872, name: "Perumanoor, Kochi" },
  { lng: 76.31731597068551, lat: 9.97927047108715, name: "Vyttila, Kochi" },
  { lng: 76.28039624708232, lat: 9.97795128926251, name: "MG Road, Kochi" },
  { lng: 76.33847125049597, lat: 9.510711954087661, name: "Alapuzha" },
  { lng: 76.51709331479078, lat: 9.57385799314408, name: "Kottayam" },
  { lng: 76.60708832441733, lat: 8.893896946845638, name: "Kollam" },
  {
    lng: 76.94875376750026,
    lat: 8.447048124263103,
    name: "Poonthura, Trivandrum",
  },
  {
    lng: 76.94344361478247,
    lat: 8.455624693919912,
    name: "Ambalathara, Trivandrum",
  },
  { lng: 76.94388673393051, lat: 8.51443055152396, name: "Pattom, Trivandrum" },
  {
    lng: 75.85771471818909,
    lat: 11.217134893374789,
    name: "Bypass Road, Kozhikode",
  },
  {
    lng: 75.78351591480516,
    lat: 11.258637691995391,
    name: "Rajiji Road, Kozhikode",
  },
  {
    lng: 75.77517751480511,
    lat: 11.26445299199151,
    name: "Nadakkava, Kozhikode",
  },
  { lng: 75.53507138452615, lat: 11.703776542799789, name: "Mahe" },
  { lng: 74.82893259218494, lat: 12.92296752604765, name: "Mangaluru" },
  {
    lng: 73.97734411484781,
    lat: 15.225126389407132,
    name: "Chinchinim, Panaji",
  },
  { lng: 73.81802191485079, lat: 15.469362689253995, name: "Taleigao, Panaji" },
  { lng: 73.81343616603833, lat: 15.485352171728627, name: "Miramar, Panaji" },
  {
    lng: 73.82472718675464,
    lat: 15.50636411428957,
    name: "Alto Beltim, Panaji",
  },
  {
    lng: 73.73271361485243,
    lat: 15.594048689175965,
    name: "Ozran Beach, Panaji",
  },
  { lng: 73.79157633392556, lat: 15.570627880734138, name: "Parra, Panaji" },
  { lng: 75.10283564184907, lat: 15.387981198130952, name: "Gokul Rd, Hubli" },
  {
    lng: 75.10373175613499,
    lat: 15.387876712019919,
    name: "Bhairidevarkoppa, Hubli",
  },
  { lng: 75.90648310770523, lat: 14.345388033628938, name: "Devanagere" },
  { lng: 77.5813471828407, lat: 14.657585985489419, name: "Anantapur" },
  { lng: 77.61843931484533, lat: 15.023949989533936, name: "Peddvaduguru" },
  { lng: 78.2226046384457, lat: 12.501480184502142, name: "Krishnagiri" },
  {
    lng: 77.08443671482641,
    lat: 13.380242190588675,
    name: "Tumakuru, Bengaluru",
  },
  { lng: 76.82513498886365, lat: 12.974923133631076, name: "Hatna, Bengaluru" },
  { lng: 77.50837131482258, lat: 13.02943999081794, name: "Peenya, Bengaluru" },
  {
    lng: 77.54934234483629,
    lat: 12.999197375217223,
    name: "Rajijinagar, Bengaluru",
  },
  {
    lng: 77.49485527479162,
    lat: 12.92201505609492,
    name: "Mailasandra, Bengaluru",
  },
  {
    lng: 77.53656931524011,
    lat: 12.915135555335162,
    name: "AGS Layout, Bengaluru",
  },
  {
    lng: 77.57234776905626,
    lat: 12.903924894876342,
    name: "Kanakapura, Bengaluru",
  },
  {
    lng: 77.54921051482202,
    lat: 12.973999990854294,
    name: "Cholourpalya, Bengaluru",
  },
  {
    lng: 77.59786841962298,
    lat: 13.02106199245251,
    name: "RT Nagar, Bengaluru",
  },
  {
    lng: 77.60711131482275,
    lat: 13.042789990809158,
    name: "Lumbini Gardens, Bengaluru",
  },
  {
    lng: 77.59400401365262,
    lat: 12.982662962253587,
    name: "Vasanth Nagar, Bengaluru",
  },
  {
    lng: 77.60330958968038,
    lat: 12.973163557183407,
    name: "Ashok Nagar, Bengaluru",
  },
  {
    lng: 77.63900851482204,
    lat: 12.975600190853314,
    name: "Indiranagar, Bengaluru",
  },
  { lng: 77.6400052804543, lat: 12.952278431701187, name: "Domlur, Bengaluru" },
  {
    lng: 77.71438131482194,
    lat: 12.966839990858993,
    name: "Whitefield, Bengaluru",
  },
  {
    lng: 77.65036734705639,
    lat: 12.871927079372448,
    name: "Singasandra, Bengaluru",
  },
  {
    lng: 77.63819949156435,
    lat: 12.890898264638778,
    name: "Hongasandra, Bengaluru",
  },
  { lng: 77.60294439283732, lat: 12.915528833756303, name: "BTM, Bengaluru" },
  {
    lng: 77.69548872901133,
    lat: 12.996244649023264,
    name: "Mahadevapura, Bengaluru",
  },
  {
    lng: 77.64412240777783,
    lat: 13.189080701747871,
    name: "Airport Road, Bengaluru",
  },
  {
    lng: 73.69754738173448,
    lat: 20.013750509804883,
    name: "Cobble Street, Nashik",
  },
  {
    lng: 73.74698631491489,
    lat: 19.950076986592507,
    name: "MIDC Ambad, Nashik",
  },
  {
    lng: 73.7826226998922,
    lat: 19.99340199671999,
    name: "Gadkari Chowk, Nashik",
  },
  {
    lng: 73.7316200291321,
    lat: 20.005186905051822,
    name: "Trambakeshwar Road, Nashik",
  },
  { lng: 75.31860136998218, lat: 19.87312703415522, name: "Aurangabad" },
  {
    lng: 74.82575391490413,
    lat: 19.264401886980128,
    name: "State Highway, Ahmednagar",
  },
  { lng: 74.70379695881425, lat: 19.15719149322901, name: "MIDC, Ahmednagar" },
  { lng: 78.99767521493082, lat: 20.922586586056042, name: "Butibori, Nagpur" },
  { lng: 79.00182621493437, lat: 21.132466885942215, name: "MIDC, Nagpur" },
  {
    lng: 79.06000812920995,
    lat: 21.13940829912116,
    name: "Dharampeth, Nagpur",
  },
  {
    lng: 79.07662491493477,
    lat: 21.155787485929686,
    name: "Civil Lines, Nagpur",
  },
  {
    lng: 81.68742611493622,
    lat: 21.237817185885408,
    name: "Labhandih, Raipur",
  },
  {
    lng: 81.63472881502916,
    lat: 21.243973385882207,
    name: "Jai Stambh Chowk, Raipur",
  },
  { lng: 81.7701209149344, lat: 21.13422898594136, name: "Naya Raipur" },
  {
    lng: 72.83014431489885,
    lat: 18.92849998717265,
    name: "Fort Mumbai, Mumbai",
  },
  {
    lng: 72.80239507556304,
    lat: 18.96559829425282,
    name: "Breachy Candy, Mumbai",
  },
  {
    lng: 72.82041031688442,
    lat: 18.968568345416422,
    name: "Dalal Estate, Mumbai",
  },
  { lng: 72.83828198082102, lat: 18.945405390117095, name: "CSMT, Mumbai" },
  {
    lng: 72.82503903873352,
    lat: 18.98957021694317,
    name: "Mahalakshmi, Mumbai",
  },
  {
    lng: 72.84569471489989,
    lat: 18.993411587135355,
    name: "Sewri West, Mumbai",
  },
  {
    lng: 72.82239491499413,
    lat: 18.994795287134593,
    name: "Lower Parel, Mumbai",
  },
  { lng: 72.82433131490018, lat: 19.0129599871241, name: "Prabhadevi, Mumbai" },
  {
    lng: 72.83688420424123,
    lat: 19.051666447372593,
    name: "Bandra West, Mumbai",
  },
  { lng: 72.8477409149005, lat: 19.035709987111048, name: "Dharavi, Mumbai" },
  { lng: 72.87877661490054, lat: 19.031329887113504, name: "Wadala, Mumbai" },
  { lng: 72.89944711490082, lat: 19.052316287101522, name: "Chembur, Mumbai" },
  {
    lng: 72.88915941425115,
    lat: 19.086126242159644,
    name: "Ashok Nagar, Mumbai",
  },
  {
    lng: 72.83177901490107,
    lat: 19.069913687091407,
    name: "Linking Road, Mumbai",
  },
  { lng: 72.9105961074656, lat: 19.116352415560037, name: "Powai, Mumbai" },
  {
    lng: 72.86783475669195,
    lat: 19.115748337650853,
    name: "Andheri East, Mumbai",
  },
  { lng: 72.83006025626624, lat: 19.13030239572458, name: "Versova, Mumbai" },
  {
    lng: 72.93825924113145,
    lat: 19.164050743510675,
    name: "Mulund West, Mumbai",
  },
  { lng: 72.84795257731552, lat: 19.240293801036398, name: "Borivalli" },
  {
    lng: 72.96248769343674,
    lat: 19.197207353171656,
    name: "Panch Pakhdi, Thane",
  },
  {
    lng: 72.97359911490351,
    lat: 19.232933786998036,
    name: "Ghodnunder Road, Thane",
  },
  { lng: 73.15131181490361, lat: 19.231170186999027, name: "Ulhasnagar" },
  {
    lng: 73.02117931799522,
    lat: 19.049769765827595,
    name: "Nerul, Navi-Mumbai",
  },
  {
    lng: 73.019638806555,
    lat: 19.063984544193787,
    name: "Turbhe, Navi-Mumbai",
  },
  { lng: 73.23441130838164, lat: 18.901721193813795, name: "Nadhal" },
  { lng: 73.42981346754205, lat: 18.73794856907204, name: "Lonavla" },
  { lng: 73.7434913148943, lat: 18.623429987349173, name: "Ashok Nagar, Pune" },
  {
    lng: 73.7809143148941,
    lat: 18.611142987356274,
    name: "Indrayani Nagar, Pune",
  },
  { lng: 73.79653211489472, lat: 18.648573987334476, name: "Chinchwad, Pune" },
  { lng: 73.82982061157207, lat: 18.648307772673544, name: "Bhosari, Pune" },
  { lng: 73.86880131489666, lat: 18.778929987259065, name: "Chakan, Pune" },
  { lng: 73.85008643316883, lat: 18.56537175044743, name: "Chikhalwadi, Pune" },
  { lng: 73.95671131489352, lat: 18.57390998737797, name: "Wagholi, Pune" },
  {
    lng: 73.90579411489333,
    lat: 18.557194587387627,
    name: "Vimam Nagar, Pune",
  },
  { lng: 73.80591556737433, lat: 18.553608037609596, name: "Aundh, Pune" },
  {
    lng: 73.82810781489279,
    lat: 18.51867258741012,
    name: "Bhandarkar Road, Pune",
  },
  { lng: 73.8035781562577, lat: 18.507202644786496, name: "Kothrud, Pune" },
  { lng: 73.84909652920743, lat: 18.48460329921439, name: "Parvati, Pune" },
  {
    lng: 73.86500922057763,
    lat: 18.5269108071154,
    name: "Agarkar Nagar, Pune",
  },
  {
    lng: 73.87574951489292,
    lat: 18.52675148740541,
    name: "Bund Garden Road, Pune",
  },
  {
    lng: 73.85038891489033,
    lat: 18.355722887505163,
    name: "Satara Road, Pune",
  },
  { lng: 73.98766131488674, lat: 18.1128899876477, name: "Shirwal" },
  { lng: 73.6551371255059, lat: 17.925861377679368, name: "Mahabaleshwar" },
  { lng: 74.25916073745681, lat: 16.682210951027088, name: "Kolhapur" },
  { lng: 74.01179296151254, lat: 17.638028111673293, name: "Satara" },
  { lng: 74.18026392791634, lat: 17.273667011307257, name: "Karad" },
  { lng: 74.2733439148703, lat: 16.953597188339874, name: "Yelur" },
  { lng: 73.13366326459591, lat: 22.403528254454145, name: "Ranoli, Vadodara" },
  {
    lng: 73.17350940483576,
    lat: 22.335875745417958,
    name: "Rambagh, Vadodara",
  },
  {
    lng: 73.19068082947267,
    lat: 22.271763618653395,
    name: "Manjalpur, Vadodara",
  },
  { lng: 73.68772300640303, lat: 21.885845278850052, name: "Kevadia" },
  { lng: 72.97056026406382, lat: 21.43641849463686, name: "mangrol, Surat" },
  { lng: 72.83369031493493, lat: 21.16494798592477, name: "Udhna, Surat" },
  { lng: 72.77852163314468, lat: 21.153059717812965, name: "Vesu, Surat" },
  {
    lng: 72.75476001493453,
    lat: 21.145173685935504,
    name: "Dumas Road, Surat",
  },
  {
    lng: 72.658619669086,
    lat: 22.999233693561244,
    name: "Mahadev Nagar, Ahmedabad",
  },
  {
    lng: 72.47946480222937,
    lat: 23.025556617218456,
    name: "BRTS Stand, Ahmedabad",
  },
  {
    lng: 72.5613281107748,
    lat: 23.029331629186924,
    name: "Ellisbridge, Ahmedabad",
  },
  {
    lng: 72.54315786938643,
    lat: 23.02821566755981,
    name: "Panjrapole Char Rasta, Ahmedabad",
  },
  {
    lng: 72.65702031497209,
    lat: 23.254195984836226,
    name: "Sector 28, Gandhinagar",
  },
  {
    lng: 72.64639431497167,
    lat: 23.231052384847832,
    name: "Sector 16, Gandhinagar",
  },
  {
    lng: 72.66601711497171,
    lat: 23.231620784847525,
    name: "Sector 21, Gandhinagar",
  },
  { lng: 70.7990053149535, lat: 22.23444398535777, name: "Rajkot" },
  { lng: 73.7463801089062, lat: 24.5750096888036, name: "Udaipur" },
  { lng: 75.79444731710326, lat: 26.83316626628152, name: "Tonk Road, Jaipur" },
  { lng: 75.79242631504371, lat: 26.85420098315286, name: "Tonk road, Jaipur" },
  {
    lng: 75.74374024118154,
    lat: 26.897507266288322,
    name: "Bhan Nagar, Jaipur",
  },
  { lng: 75.83482527914452, lat: 26.90157945927076, name: "Raja Park, Jaipur" },
  { lng: 75.77514331504624, lat: 26.97228898310192, name: "VKI Area, Jaipur" },
  { lng: 76.27486855943664, lat: 27.873238227289487, name: "Behror" },
  { lng: 75.88411436156137, lat: 22.71939082000158, name: "AB Road, Indore" },
  {
    lng: 75.88844714900351,
    lat: 22.73004093318158,
    name: "Anoop Nagar, Indore",
  },
  {
    lng: 75.87902315433176,
    lat: 22.72296884335845,
    name: "Race Course, Indore",
  },
  {
    lng: 75.84193567705822,
    lat: 22.696091997613863,
    name: "Annapurna Road, Indore",
  },
  {
    lng: 77.43234455767393,
    lat: 23.18249762224828,
    name: "Rohit Nagar, Bhopal",
  },
  { lng: 77.45458031497215, lat: 23.25900598483377, name: "JK Road, Bhopal" },
  {
    lng: 77.0325822051158,
    lat: 28.449040926843743,
    name: "Civil Lines, Gurugram",
  },
  {
    lng: 77.0643443151652,
    lat: 28.408706682506665,
    name: "Badshahpur, Gurugram",
  },
  {
    lng: 77.0643443151652,
    lat: 28.408706682506665,
    name: "Wazirabad, Gurugram",
  },
  {
    lng: 77.08001404198892,
    lat: 28.444625220918763,
    name: "Adree City, Gurugram",
  },
  {
    lng: 77.09104780294513,
    lat: 28.497870577470067,
    name: "Cyber City, Gurugram",
  },
  {
    lng: 77.08126142921861,
    lat: 28.467159998905228,
    name: "Galleria, Gurugram",
  },
  {
    lng: 77.14224790604008,
    lat: 28.428136800316658,
    name: "Baliaswas, Gurugram",
  },
  { lng: 77.05953822677112, lat: 28.57859491825417, name: "Dwarka, New Delhi" },
  {
    lng: 77.10073970568223,
    lat: 28.62544317093738,
    name: "Janakpuri, New Delhi",
  },
  {
    lng: 77.12481431508267,
    lat: 28.633363882417427,
    name: "Mayapuri, New Delhi",
  },
  {
    lng: 77.15141131508322,
    lat: 28.66077998240669,
    name: "Moti Nagar, New Delhi",
  },
  { lng: 77.13495523527895, lat: 28.70942701321459, name: "Rohini, New Delhi" },
  {
    lng: 77.14080331508474,
    lat: 28.727308982380453,
    name: "Rohini, New Delhi",
  },
  {
    lng: 77.15418325747557,
    lat: 28.69173531908756,
    name: "Gujranwala, New Delhi",
  },
  {
    lng: 77.20302116759049,
    lat: 28.68417026832617,
    name: "Civil Lines, New Delhi",
  },
  {
    lng: 77.20564842680818,
    lat: 28.628707200177114,
    name: "Connaught Place, New Delhi",
  },
  {
    lng: 77.2913673150823,
    lat: 28.62144998242217,
    name: "Patparganj, New Delhi",
  },
  {
    lng: 77.23500051508195,
    lat: 28.60192548242997,
    name: "Golf Club, New Delhi",
  },
  {
    lng: 77.19547901482926,
    lat: 28.599726904524395,
    name: "Chanakyapuri, New Delhi",
  },
  {
    lng: 77.24061228813795,
    lat: 28.568351794176028,
    name: "Lajpat Nagar, New Delhi",
  },
  { lng: 77.21541464010805, lat: 28.527981052242836, name: "Saket, New Delhi" },
  { lng: 77.30895131507779, lat: 28.418729982502676, name: "Faridabad" },
  {
    lng: 77.37698223241983,
    lat: 28.683204652490073,
    name: "Loni Road, Ghaziabad",
  },
  {
    lng: 77.42855745076079,
    lat: 28.674612396003166,
    name: "Patel Nagar, Ghaziabad",
  },
  {
    lng: 77.4841963150839,
    lat: 28.691014182394817,
    name: "Govindpuram, Ghaziabad",
  },
  { lng: 77.31750131508169, lat: 28.590929982434126, name: "Sector 5, Noida" },
  { lng: 77.32968318168327, lat: 28.596679462461253, name: "Sector 11, Noida" },
  {
    lng: 77.49351934899465,
    lat: 28.45715255573134,
    name: "Knowledge Park III, Greater Noida",
  },
  {
    lng: 77.52293998227402,
    lat: 28.457825875124087,
    name: "Surajpur, Greater Noida",
  },
  {
    lng: 74.80986305820312,
    lat: 32.66960869999999,
    name: "National Highway, Jammu",
  },
  { lng: 74.89470349933099, lat: 32.70660466854263, name: "Bathindi, Jammu" },
  { lng: 75.62005960494608, lat: 31.43122078741564, name: "Jalandhar" },
  { lng: 76.94253171912283, lat: 29.575571805593494, name: "Karnal" },
  { lng: 77.99633647654214, lat: 30.289332832690008, name: "Majra, Dehradun" },
  {
    lng: 77.98290741512037,
    lat: 30.268266981801375,
    name: "Mohabbewala, Dehradun",
  },
  { lng: 75.87381031513526, lat: 30.88970598158262, name: "GT Road, Ludhiana" },
  { lng: 75.8819263151354, lat: 30.895734981580688, name: "Samrala, Ludhiana" },
  {
    lng: 76.74412231513021,
    lat: 30.679712881655643,
    name: "Sector 65, Chandigarh",
  },
  {
    lng: 76.79443131513058,
    lat: 30.696489981649766,
    name: "Ram Darbar, Chandigarh",
  },
  {
    lng: 76.83423351513143,
    lat: 30.730917981637763,
    name: "IT Park Road, Chamdigarh",
  },
  { lng: 77.72168112921979, lat: 29.30978319888473, name: "Khatauli Bypass" },
  { lng: 78.00799559521006, lat: 27.200596813648254, name: "Agra" },
  { lng: 80.32887670601741, lat: 26.482313637040825, name: "Permat, Kanpur" },
  { lng: 80.32512131503536, lat: 26.46046998332443, name: "GT Road, Kanpur" },
  { lng: 80.91175409373106, lat: 26.78730165215699, name: "Ashiyana, Lucknow" },
  {
    lng: 80.96383762928524,
    lat: 26.900849265831983,
    name: "Sitapur Road, Lucknow",
  },
  {
    lng: 81.07228976381248,
    lat: 26.892427571735453,
    name: "Tiwariganj, Lucknow",
  },
];
