---
layout: article.njk
title: Learning zkApps with Zeko and Claude
---



## In which I talk with Claude to build a zero-knowledge blind auction on Zeko


I just spent 3.5 days [building](https://github.com/aaronmgdr/zeko-blind-auction) a blind auction on the [Zeko](https://zeko.io/) Layer 2 (Mina) Blockchain with [o1.js](https://docs.o1labs.org/o1js). I've never used any of these technologies before.


### The Process


First I spent about a day asking Claude to study Zeko and o1.js docs and to [write Skills for itself](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) on creating zk apps – essentially creating a specialized system prompt for ZK development. After reading the docs myself and pointing out a few errors I asked Claude to fix them. Then I prompted it to find and fix any mistakes and a skill for the overall architecture of a zk app. It had only created specific parts such as writing a zk contract.


At this point it seemed that all the bugs had been ironed out. Both myself and Claude had reviewed and audited it, but I can't be certain. There is some amount of actual experience with a system to know if what I have is truly the best way. Nevertheless I felt at least confident that nothing was catastrophically wrong. It was time to present Claude with the actual product.


I told Claude that:
> "I want to build a ZK blind auction on zeko and to help me design the entire app."


It understood the assignment. But I saw some issues immediately.


First it designed a bond system where bids equaled bonds. This seemed to negate the blind aspect of the system. After pointing this out, Claude agreed and updated to a fixed bond amount.


Second it wasn't clear to me why some values were stored in an onchain state and some were offchain. I spent some time going back and forth with Claude asking it to explain the reasoning and justification for each state field. Importantly this is also how I learned that the number of @state Value you have is not the same as the number of state slots you are using as some Value types use multiple slots.


With these issues fixed I began to iterate with Claude,


* Why do we compile on each page load? => compilation moved to server with static file fetching.


* Can we provide more granular feedback while contracts are loading?  => Update for each contract.


* why does the user need to type in the contract address => moved to env file.


* We seem to be authorizing this transfer with the auction contract's private key. This looks unsecure. Please research the proper way to do this -> update to the zk security skill and the claimNFT method to use a proof instead of a signature.


I followed a similar pattern for every compilation error or other bug, feeding the entire console output into Claude to fix the issue.


Sometimes Claude became stuck. Once it explained the exact problems and told me the fix but then got stuck in a loop of creating tiny node scripts to read files deep in the node modules tree. I told it to stop and just make the edits it had planned to make.


Full disclosure: I was not able to deploy or run the app since I had trouble with the Zeko faucet and mina to Zeko bridge. The process was highly educational. Here are my key learnings. 


### Learning 1


Max of 8 onchain state fields on a o1 SmartContract means state variables run out fast. Most of my time was spent on deciding which fields really needed this valuable space. My understanding is that offchain state can be read only after being settled, so you can write many times (really dispatch an action) but then when you settle all of the actions get reduced to one final value. You can settle more than once but can't read in the same transaction as you write. So it's really best to just write once after you are done with a stage.  




### Learning 2


It is possible to use AI for building with completely new systems but I would definitely recommend reading the docs yourself first and questioning all the decisions that AI makes. When I use AI to code with languages and frameworks I know I can see what is good and what is wrong. Never having created a zk program before, I'm asking "why" even more. I'm asking about alternatives and demanding explanations. It's expensive: I ran out of tokens twice and before committing a single line of code.
### Learning 3
The Zeko Developer experience is pretty cool considering how odd it is not to have basics like conditionals. I do worry about how the need for large contracts on each user’s device slows down the app load time.

To Learn More See [the code on my github](https://github.com/aaronmgdr/zeko-blind-auction) 


