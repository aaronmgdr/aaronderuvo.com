---
layout: article.njk
title: Signing off-chain EIP-712 messages over WalletConnect with SAFE multisigs
---

## Intro

A while ago my old team received a bug complaint. Users with SAFE multisigs couldn't sign the typed data message we used to listen for delegates on Celo's Mondo Governance App. It seemed that without an on-chain transaction to look for there was no way for the final signature to be received and due to how the cryptography works, we thought it would not work the same as a typical account even if we did get a signature back. We created a workaround (asking users to submit a PR directly to us) and left it at "won't fix." 

I'm no longer with that team, and curiosity brought me back to this problem: what would it take to make offchain EIP-712 signing with multisigs not just possible, but a smooth user experience?

### Who this is for

- Technical readers comfortable with web development (APIs, HTTP, async flows) but not expected to be blockchain experts. 
- Engineers implementing auth/signature flows for dApps who want to support shared wallets (multisigs).

### Follow along

- A companion repo for this article exists at https://github.com/aaronmgdr/712-offchain-safe-signer-demo

### TL;DR — What you'll learn

- Plain-language background on the building blocks (EIP-712, SAFE multisigs, WalletConnect).
- A high-level flow for how safe multisigs sign offchain typed data and how your app can detect completion.
- Concrete code snippets and polling/persistence ideas to give a reliable UX.

### What success looks like

Users who connect a SAFE multisig should see a single persistent "signing in progress" message, the app should detect finalization when the multisig reaches its threshold, verify the final signature via ERC-1271, and accept the signed submission exactly like an EOA signature would be accepted.

## Quick tangent on background

A short, plain-language glossary and a simple flow will help make the rest of the article much easier to follow.

### Some Terms

- **EIP-712** — a standard way to sign structured data so both the signer and the verifier know exactly what was approved. Think: signing a JSON contract instead of a single opaque blob.
- **SAFE multisig** — a shared wallet (a "safe") controlled by multiple people. A configured threshold (e.g., 2-of-3) determines how many signers must agree to create a valid signature for actions. 
- **WalletConnect** — a transport protocol that lets a dApp ask a wallet to sign something (like OAuth but for wallets).
- **ERC-1271** — a standard that lets a smart contract validate signatures. Since a multisig is a contract, it can't produce a regular EOA signature; instead the contract exposes an `isValidSignature` method you can call to verify a signature.

### High-level flow (how it works)

1. The dApp prepares an EIP-712 typed-data message and asks the connected signer to sign via WalletConnect.
2. If the connected address is a SAFE, the SAFE will create an internal message that other owners can confirm (it registers a SafeMessage).
3. Owners confirm the message by signing it with their individual keys (sometimes via WalletConnect sessions to the SAFE UI).
4. When enough confirmations are collected (meets the SAFE threshold), the SAFE aggregates/prepares a final signature. The dApp can then call the SAFE contract's `isValidSignature` to confirm the message is valid.


## Searching for Answers

Gemini says we will be needing SAFE'S Protocol Kit https://docs.safe.global/sdk/protocol-kit — remember this for later.

My hunch that a multisig signature would not be verifiable in the same way as an EOA was correct. Thankfully there is an ERC for that: [ERC-1271: Standard Signature Validation Method for Contracts](https://eips.ethereum.org/EIPS/eip-1271). In practice this means you don't recover an EOA `address` from the signature; instead you call the multisig contract's `isValidSignature` method with the signed data and the signature. If valid, `isValidSignature` returns the 4-byte magic value `0x1626ba7e` (the standard success marker defined by ERC-1271).

CoW DAO has an [excellent explanation of ERC-1271](https://cow.fi/learn/eip-1271-explained).

## The Desired Outcome

I have a dapp which uses offchain EIP712 messages for verification. 

When I sign with an EOA the app waits for a signature and then when it receives one verifies it and if valid accepts my submission by showing me a success message. 

When I sign with a SAFE Multisig the app 

a) shows me a toast message that I am signing with a multisig

b) keeps showing that toast even if I reconnect only days later because it has a persistent memory that an EIP-712 message signing is in progress

c) is aware when the SAFE multisig has completed signing

d) verifies the final message with ERC1271 and shows the success message if valid in same way as for EOA


### Trials and errors 

With Claude for some scaffolding I set up a Vite + reown/appkit + wagmi + zustand app. 

After getting the config right, I was able to sign the EIP-712 typed data in the Safe using my two signing wallets. However...

I now need to set up the app to poll the Safe transaction service for the status of the signature. 

SAFE provides APIs for listing all messages for a Safe https://api.safe.global/tx-service/celo/api/v1/safes/${safeAddress}/messages 

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

`SafeMessage` matches what is returned from passing our `signTypedDataMessage` object into viem's `hashTypedData`

https://github.com/safe-global/safe-core-sdk/blob/main/packages/protocol-kit/src/utils/signatures/utils.ts#L243

We can get the hash we need (SafeMessage *hash*) by passing the hash obtained from `hashTypedData` into `Safe#getSafeMessageHash` method from "@safe-global/protocol-kit"


```typescript

import {hashTypedData} from 'viem'
import Safe from '@safe-global/protocol-kit'

const messageHash = hashTypedData(eip712TypedDataMessage)

const safe = await Safe.init({
      provider: RPC_URL_FOR_CONNECTED_CHAIN,
      safeAddress: addressOfTheConnectedSafe
  });

const safeMessageHash = await safe.getSafeMessageHash(messageHash);
```

Call the Safe tx-service API `https://api.safe.global/tx-service/${chainName}/api/v1/messages/${safeMessageHash}/` with the following headers

```typescript
{
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${SAFE_API_KEY}`,
}
```

There will be two fields on the message GET response that matter here: `confirmations` and `preparedSignature`.

- `confirmations` is an array of the owners who have confirmed the message. When its length meets the `safe.getThreshold()` value, you can validate the signature.
- `preparedSignature` is the assembled signature payload that the SAFE exposes once signers have provided individual approvals. Its exact format can vary; treat it as an opaque `bytes` payload that you will pass into `isValidSignature`.

A typical polling loop (pseudo-code):

```js
// 1) Ask Safe for its SafeMessageHash (see earlier) using the hashTypedData value
// 2) GET /messages/{safeMessageHash}
// 3) if (response.confirmations.length >= await safe.getThreshold()) {
//      // we have enough confirmations
//      const magic = await safeContract.isValidSignature(safeMessageHashBytes, response.preparedSignature)
//      if (magic === '0x1626ba7e') {
//        // signature is valid — proceed
//      }
// }
```

Note: `0x1626ba7e` is the ERC-1271 success value (see above) however some implementations return `0x20c13b0b`. Also watch for empty `preparedSignature` values until enough confirmers have signed.



## Steps

1. Initiate signing of typed data over WalletConnect as normal.

2. Call `getSafeMessageHash` with the typed-data message hash (the output from `hashTypedData`).

3. Use the Safe message hash to query Safe for messages.

4. When confirmations match the threshold, save `preparedSignature`.

5. Pass the Safe message hash and signature to `isValidSignature`.

6. Perform the action which required authentication.


## Demo 

Visit [712-offchain-safe-signer-demo](https://712-offchain-safe-signer-demo.aaron-deruvo.workers.dev/) for a demonstration of this in action. 



## What's good and what needs improvement.

We successfully received the signature back in our application and were able to verify it. 

However, while this setup works nicely for signing with SAFE wallets from one browser, most of the time a multisig will have multiple people signing over a potentially multi-day period. When signing, our app doesn't have a way to check if the connected Safe already has pending messages, and as such will always initiate a new one.


We will need a way to globally associate a connected address to pending signatures. We could use the SAFE API to look for messages without sufficient signatures that match the domain we are using. Although without a verifying contract it is possible we will get a conflict or false positive or worse! A safer approach would be to save the `safeMessageHash` to our own data store and query for message hashes associated with the connected address. 

Our solution also fails for other ERC-1271 compliant wallets which are not SAFE wallets. An implementation that handles them will need to:

1. Differentiate SAFE from other ERC-1271 contracts (SAFE has a tx-service and SDK).
2. If not SAFE, look for alternate ways the wallet exposes signature state (some smart wallets will return prepared signatures over WalletConnect; others may require a completely different flow).

---

## Testing & debugging

- Use the Safe UI to watch the same message appear; the UI lists the hashes and confirmations and is a good ground truth.
- Query the Safe tx-service directly with curl to inspect the `confirmations` and `preparedSignature`. Example:

```
curl -H "Authorization: Bearer $SAFE_API_KEY" \
  "https://api.safe.global/tx-service/${chainName}/api/v1/messages/${safeMessageHash}/"
```

- Call `isValidSignature` against the SAFE contract with the data and the `preparedSignature` to verify the magic success value.

## UX & practical suggestions

- Persist the `safeMessageHash` server-side (or in local storage) so reconnecting browsers can resume in-progress signings instead of creating duplicates.
- When listing pending messages, narrow by domain and a nonce inside your typed data to avoid confusing unrelated messages.
- Show a persistent toast stating "Multisig signing in progress" with a link to view status.

## Security considerations

- Always include a unique nonce and the dApp domain inside your EIP-712 domain to prevent replay and cross-site confusion.
- Display the exact typed data that is being signed (human-friendly summary) before asking the SAFE to sign — phishing is possible if a signer is tricked into confirming a malicious payload.
- Consider server-side verification and auditing: store message hashes and the expected typed data when creating signing requests.

## Next steps & resources

- [Read the Safe Protocol Kit docs](https://docs.safe.global/sdk/protocol-kit)
- [ERC-1271 spec](https://eips.ethereum.org/EIPS/eip-1271)
- [CoW DAO's explanation of ERC-1271](https://cow.fi/learn/eip-1271-explained)

---


