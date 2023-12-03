import Web3 from "web3";
import { useState, useRef, useCallback, useMemo } from "react";

const reservationAddress = "0xA4d6D64E72088248Da7a7229591760D33Fb09632";
const serviceAddress = "0xdC211bD05a035D2dcFB4D9628589d191c513E91F";
const accountAddress = "0xb5232d97ee8D4fC68dEd25358b06c9e98D1B6649";

const accountABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_serviceAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
    ],
    name: "AccountRequestCanceled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
    ],
    name: "AccountRequestCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "string",
        name: "_errorMessage",
        type: "string",
      },
    ],
    name: "ErrorOccurred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
    ],
    name: "cancelRequest",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_url",
        type: "string",
      },
      {
        internalType: "string",
        name: "_path",
        type: "string",
      },
    ],
    name: "requestAccount",
    outputs: [
      {
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "requestsOfUser",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
const reservationABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_serviceAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "string",
        name: "_errorMessage",
        type: "string",
      },
    ],
    name: "ErrorOccurred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "_reservationId",
        type: "bytes32",
      },
    ],
    name: "ReservationCanceled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "_reservationId",
        type: "bytes32",
      },
    ],
    name: "ReservationCreated",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_reservationId",
        type: "bytes32",
      },
    ],
    name: "cancelReservation",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_url",
        type: "string",
      },
      {
        internalType: "string",
        name: "_path",
        type: "string",
      },
    ],
    name: "makeReservation",
    outputs: [
      {
        internalType: "bytes32",
        name: "_reservationId",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "reservationsOfUser",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "service",
    outputs: [
      {
        internalType: "contract FunctionsService",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
const serviceABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
    ],
    name: "ChainlinkCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
    ],
    name: "ChainlinkFulfilled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "id",
        type: "bytes32",
      },
    ],
    name: "ChainlinkRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "OwnershipTransferRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "string",
        name: "_requestType",
        type: "string",
      },
    ],
    name: "RequestCanceled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "string",
        name: "_requestType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "_result",
        type: "string",
      },
    ],
    name: "RequestCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "string",
        name: "_requestType",
        type: "string",
      },
    ],
    name: "RequestMade",
    type: "event",
  },
  {
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
    ],
    name: "cancelRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
      {
        internalType: "string",
        name: "_result",
        type: "string",
      },
    ],
    name: "fulfill",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_requestType",
        type: "string",
      },
      {
        internalType: "string",
        name: "_url",
        type: "string",
      },
      {
        internalType: "string",
        name: "_path",
        type: "string",
      },
    ],
    name: "request",
    outputs: [
      {
        internalType: "bytes32",
        name: "_requestId",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "requestRecords",
    outputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "string",
        name: "requestType",
        type: "string",
      },
      {
        internalType: "string",
        name: "url",
        type: "string",
      },
      {
        internalType: "string",
        name: "path",
        type: "string",
      },
      {
        internalType: "enum FunctionsService.RequestStatus",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "string",
        name: "result",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const useWeb3 = () => {
  const web3Ref = useRef(
    new Web3(
      new Web3.providers.WebsocketProvider(
        "wss://sepolia.infura.io/ws/v3/18219f234a874bed9cde55db88d2b49b"
      )
    )
  );
  const web3 = web3Ref.current;

  let reservationCode;
  let accountResponse;
  //   let walletAddress;
  const [walletAddress, setWalletAddress] = useState("");

  const hasConnectToWallet = !!walletAddress;

  const onConnect = useCallback(async () => {
    if ((window as any)?.ethereum) {
      const web3 = new Web3((window as any).ethereum);
      try {
        await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });
        const accounts = await web3.eth.getAccounts();
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.error("MetaMask is not installed");
    }
  }, []);

  function transaction(from: string, to: string, amount: string) {
    const web3 = new Web3((window as any).ethereum);
    (window as any).ethereum
      .request({ method: "eth_requestAccounts" })
      .then(() => {
        const fromAddress = from;
        const toAddress = to;
        const amountInWei = web3.utils.toWei(amount, "ether");
        const transactionObject = {
          from: fromAddress,
          to: toAddress,
          value: amountInWei,
          gas: 21000,
        };

        web3.eth
          .sendTransaction(transactionObject)
          .then((receipt) => {
            console.log("Transaction receipt:", receipt);
          })
          .catch((error) => {
            console.error("Transaction error:", error);
          });
      })
      .catch((error: any) => {
        console.error("MetaMask connection error:", error);
      });
  }

  const getContract = useCallback(
    (abi: any, address: string) => {
      return new web3.eth.Contract(JSON.parse(JSON.stringify(abi)), address);
    },
    [web3]
  );

  const reservationContract = useMemo(() => {
    return getContract(reservationABI, reservationAddress);
  }, [getContract]);
  const serviceContract = useMemo(() => {
    return getContract(serviceABI, serviceAddress);
  }, [getContract]);
  const accountContract = useMemo(() => {
    return getContract(accountABI, accountAddress);
  }, [getContract]);

  return {
    web3,
    hasConnectToWallet,
    walletAddress,
    reservationContract,
    serviceContract,
    accountContract,
    onConnect,
    transaction,
  };
};
