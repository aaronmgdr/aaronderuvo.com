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

I now need to setup the app to poll the safe transaction service for the status of the signature. There was also a message received over wallet connect that *might* be something interesting for us.

```
"onRelayMessage() -> failed to process an inbound message: ALm/I7KpFzFLY4HEEMwY6BgHSwAsuE5VOMj8bJBdT2ameDhLFLFPSUd2gBXdLDYLv1LErC+YdvfB7oSThBWA7uUfhek0H6ahKvKaZ4m6h8ZO2XfXmitS0dO22xKd7rpuK0+0rXc+C559ggrcA6+FyznGmyU51tRaAL1Z4SogGFA4a9wkm8J1GLCdasQVNB1Gsq+5Q3fCwnBe89YFG36FpqFoxm8jedZ+wdQkJRuv0V7j/bE4P8Hym78gDzjunJA9ciDYZjTB6D9kOb7uK9AJVBASyli23wVmxifz/bg9VYs5Gxz7Hr8eaU7cvXEzEv8lMjhCt1WujidLyaGrvmDTad7QcbKywzWRUmLsdbMAoGJ5DSTKo8HKd29BG1GuyhEpyDf9KG/KzHCrnG88wHi4c6KuAeovFZ7XFK+VsnQNjAOlIwWfE46d5h4fzmSl15LBA73tzwBS"
```

