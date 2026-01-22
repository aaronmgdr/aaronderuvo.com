title: Signing offchain 712 messages over Wallet Connect with SAFE multisigs

----

## Intro

A while ago my old team received a bug complaint. Users with safe multisigs couldn't sign the typed data message we used to listen delegates on Celo's Mondo Governance App. It seemed that without an onchain transaction to look for there was no way for the final signature to be received and due to how the cryptography works We thought it was possible it would not work, even if we did get a signature back. Reasoning that it was a rare issue for us and not specific to us, we created a workaround (asking users to submit a PR directly to us) and left it at won't fix. 

I'm no longer with that team but now with some spare time on my hands curiousity has come back to the question: What would it truly take to make offchain signing of EIP712 typed data with multisigs not only possible but an excellent user experience? 

## Quick tangent on background

* EIP712 -- the standard for signing (on or offchain) structured data. 

* SAFE Multisig -- the Industry standard for evm multi party/multi key vaults. 

* Wallet Connect -- connects a signer to Dapp requestiing signaure. (In our case Signer is the SAFE vault itself and then signers of the multisig connect to SAFE with another Wallet Connect connection. So that there are connections -- multi-sig-signer-key to multisig and multisig to dapp).


## Searching for Answers

Gemini says we will be needing SAFE'S Protocol Kit https://docs.safe.global/sdk/protocol-kit 
Remember this for later. 

Our hunch that a multisig signature would not be verifiable in the same way as an EOA turned out to be correct. Thankfully there is an ERC for that. [ERC-1271: Standard Signature Validation Method for Contracts ](https://eips.ethereum.org/EIPS/eip-1271) So there is a way. 

CoW DAO has an [excellent explanation of ERC-1271](https://cow.fi/learn/eip-1271-explained).


## The Desired Outcome

I have a dapp which uses offchain EIP712 messages for verification. 

When I sign with an EOA the app waits for a signature and then when it receives one verifies it and if valid accepts my submission by showing me a success message. 

When I sign with a SAFE Multisig the app 

a) shows me a toast message that I am signing with a multisig

b) keeps showing that toast even if I reconnect only days later because it has a persistant memory that A 712 message signing is in progress

c) is aware when the the safe multisig has completed signing

d) verifies the final message and shows the success message if valid in same way as for EOA


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


`SafeMessage hash` is `messageHash` in the  json returned from the messages list API service and the message_hash wanted by the message GET API.  https://api.safe.global/tx-service/celo/api/v1/messages/0xb61f0567bd932d160847fcd5aa06ccc83a20783e23b997d4a97c77beed43849e


`SafeMessage` matches what is returned from passing our signTypedDataMessage object to `hashTypedData`

