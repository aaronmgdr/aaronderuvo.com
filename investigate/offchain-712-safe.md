title: Signing offchain EIP712 messages over Wallet Connect with SAFE multisigs

----

## Intro

A while ago my old team received a bug complaint. Users with safe multisigs couldn't sign the typed data message we used to listen delegates on Celo's Mondo Governance App. It seemed that without an onchain transaction to look for there was no way for the final signature to be received and due to how the cryptography works, We thought it was possible it would not work the same as an typical account, even if we did get a signature back. Reasoning that it was a rare issue for us and not specific to us, we created a workaround (asking users to submit a PR directly to us) and left it at won't fix. 

I'm no longer with that team but now with some spare time on my hands curiousity has come back to the question: What would it truly take to make offchain signing of EIP712 typed data with multisigs not only possible but an excellent user experience? 

## Quick tangent on background

* EIP712 -- the standard for signing (on or offchain) structured data. 

* SAFE Multisig -- the Industry standard for EVM multi party/multi key vaults. 

* Wallet Connect -- connects a signer to dAPP requestiing signaure. (In our case Signer is the SAFE vault itself and then signers of the multisig connect to SAFE with another Wallet Connect connection. So that there are 2 layers of connection -- multi-sig-signer-key to multisig and multisig to dapp).


## Searching for Answers

Gemini says we will be needing SAFE'S Protocol Kit https://docs.safe.global/sdk/protocol-kit 
Remember this for later. 

The hunch that a multisig signature would not be verifiable in the same way as an EOA turned out to be correct. Thankfully there is an ERC for that. [ERC-1271: Standard Signature Validation Method for Contracts ](https://eips.ethereum.org/EIPS/eip-1271) So there is a way. 

CoW DAO has an [excellent explanation of ERC-1271](https://cow.fi/learn/eip-1271-explained).


## The Desired Outcome

I have a dapp which uses offchain EIP712 messages for verification. 

When I sign with an EOA the app waits for a signature and then when it receives one verifies it and if valid accepts my submission by showing me a success message. 

When I sign with a SAFE Multisig the app 

a) shows me a toast message that I am signing with a multisig

b) keeps showing that toast even if I reconnect only days later because it has a persistant memory that A 712 message signing is in progress

c) is aware when the the safe multisig has completed signing

d) verifies the final message with ERC1271 and shows the success message if valid in same way as for EOA


### The trials and Errors 

With Claude for some scaffolding I setup a vite + reown/appkit + wagmi + zustand app. 

After Getting the config right I am able to sign the erc712 typed data in Safe by my two signing wallets. However...

I now need to setup the app to poll the safe transaction service for the status of the signature. 

SAFE provides API's for listing all messages for a Safe https://api.safe.global/tx-service/celo/api/v1/safes/${safeAddress}/messages 

or fetching one message https://api.safe.global/tx-service/${chainName}/api/v1/messages/${msgHash}/

Unfortunately the msgHash here is not the same as the message hash we get back from calling `hashTypedData` 

The Safe UI displays 4 hashes.

> SafeMessage:
> 0x7e3b4bd7c4722b8b016356786481920e5c941b43cfff925c6500c23005c8bdaa
> 
> SafeMessage hash:
> 0xb61f0567bd932d160847fcd5aa06ccc83a20783e23b997d4a97c77beed43849e
> 
> Domain hash:
> 0x147a50bad9201678931fcd62a49d415e0d7138bb5e262a493779b9f93862c030
> 
> Message hash:
> 0xb55cbc239659768f4692337e2db9333f383eca88163e0ff57b98fcafc475a111


`SafeMessage hash` is `messageHash` in the  JSON returned from the messages list API service and the message_hash wanted by the message GET API.  

*tip: The safe tx-service api appears to only return messages with at least one confirmation.*

`SafeMessage` matches what is returned from passing our signTypedDataMessage object to `hashTypedData`

https://github.com/safe-global/safe-core-sdk/blob/main/packages/protocol-kit/src/utils/signatures/utils.ts#L243

We can get the hash we need (SafeMessage hash) by passing the hash obtained from `hashTypedData` into `Safe#getSafeMessageHash` method from "@safe-global/protocol-kit"


```typescript

import {hashTypedData} from 'viem'
import Safe from '@safe-global/protocol-kit'

const messageHash = hashTypedData(eip712TypedDataMessage)

const safe = await Safe.init({
      provider: RPC_URL_FOR_CONNECTED_CHAIN,
      safeAddress: addressOfTheConnectedSafe
  });

const safeMessagreHash = await safe.getSafeMessageHash(messageHash),
```

Call the safe-tx api service https://api.safe.global/tx-service/${chainName}/api/v1/messages/${safeMessageHash}/ with the following headers

```typescript
{
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${SAFE_API_KEY}`,
}
```

There will be 2 fields on the response that you will need. `confirmations` and `preparedSignature`

Compare the confirmations count to the threshold return from `safe.getThreshold()`. when the count is sufficient call `isValidSignature` on your safe wallet contract instance. 

```js
const SAFE_ERC1271_ABI = [
  {
    inputs: [
      { name: '_data', type: 'bytes' },
      { name: '_signature', type: 'bytes' },
    ],
    name: 'isValidSignature',
    outputs: [{ name: '', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
]
```



## Steps. 

1. initiate sign typed data over wallet connect as normal

2. call getSafeMessageHash with the 

3. use safe message hash to query safe for messages

4. when confirmations match threshold save prepared signature

5. pass safe message hash and signature to isVerifiedSignature

6. Perform the action which required authentication



## Whats good and what will need improvement.

We successfully received the signature back in our application and were able able to verify it. 

However while this setup works nicely for signing with SAFE Wallets from one browser, most of the time an Multisig will have multiple people signing over potentially a multi day period. When signing our app doesnt have a way to check if the connect safe already has pending messages and as such always will initiate a new one.


We will need a way to globally assosiate a connected address to pending signatures. We could use the SAFE api to look for messages without sufficient signatures And which match the domain we are using. Although without a verifying contract it is possible we will get a conflict or false positive or worse![1] A safer approach would be to save the SafeMessageHash to our own data store and query for message hashes associated with the connected address. 

Our solution also fails for other ERC1271 compliant wallets which are not SAFE wallets. An implementation that handles them will need to 1. differentiate between SAFE and other ERC1271 wallets and if not SAFE look for an alternate way to get the final signature. If simply a smart wallet the signature may be returned over wallet connect. if another type of multisig an alternative form of gathering signature status will need to be designed. 


 1. A potential scenario. First signer is tricked into signing a nefarious message. It shows up on the legitimate website for the other signers. 

