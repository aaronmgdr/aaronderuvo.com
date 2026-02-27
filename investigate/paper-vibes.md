---
layout: article.njk
title: Vibing it All the Way -- Lessons in Vibe Coding PaperHearts from idea to release.
---

# Lessons in Vibe Coding PaperHearts from Idea to Release.

A week ago I [posted on LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7429959175872495617) that I vibe-coded an app from idea to deploy over 4 afternoons. A week later I finally actually have the app in a state I would call production ready(ish).

## What happened? What did I do this past week?

The app I had on day 3 worked, but it still needed some work. But rather than start in the middle let's go back to day 1 and walk thru my entire process and then explain what made the oneshot app a good demo but not a complete product. 

Note that each day isn't a full working day more like an afternoon. 


### Days 0-1. 

My finance and I have been using google keep to keep a shared diary where we write to each other about our day. I thought creating a dedicated app for this could be fun and simple. 

I began by telling google gemini about the app i wanted to build, and some technologies I was interested in using. Solid JS had been on my list for a while so I told gemini this while we were coming up with the stack. After specifying that I wanted a progressive web app with end to end encryption for creating a shared journal for couples and going back and forth with gemini to polish up all the product and technical requirements. I then described the aesthetic / feel I wanted and had it generate me a color scheme and visual spec. 

I then took these documents into claude and further refined the technical prd by co designing the database schema we would need. I should mention here that Paper Hearts uses client side encryption and only uses the database as a relay / to connect users to each other. All authentication is thru public key cryptography. 


### Days 2-3

Specs complete I asked claude to create the backend system we had designed. Everything worked well. Installing packages, setting up scaffolds. Creating routes, writing tests. 

Then I moved to the frontend and more or less in one shot I had something that looked nice thanks to the visual spec/color scheme and almost worked. At least well enough that I decided it was time for hosting

### Day 4

For hosting I decided to use a service i had never used before -- Railway. I wanted something with vercel like quick setup with built in postgres support that was very cheap or free. Claude's ability to help declined somewhat here. Railway is not hard to set up, but I did have to decide if my client and server were separate railway services or not, and get railway to recognize its own postgres server env, and to run my bun commands correctly. Overall, while I still used claude for this it was more likely to lead me down the wrong path than when it could see its own results.  


### Days 5-10

Ok the App is deployed: Is it ready to show the world? At first It feels like it is. It opens. I can create an Account. But let me put on a few more hats. I look at the app as a designer  -- hmm ok some of these colors are not quite right and this interaction isn't great. I put on my QA hat. Ok why are notifications not showing? My QA PM hat: When I submit why must my partner refresh to see my entry? For each of these issues I will either immediately bring the issue to claude and work thru it or (if I notice one while in the middle of a task) I will write down a little todo in todo.md. Once done with current I'll go back to the todo to find the next one. I'll re-review and re-QA and re-test. And ask Claude to find bugs itself. And repeat. 

Over time I realize that there are far more and far deeper problems than I originally thought. Some of these bugs require fixes that would have broken the app for existing users if I had released on day 4. During this time we introduce websockets for the initial pairing, Leverage the Push and Notifications web APIs to deliver submissions fast. Claude and I iterate back and forth. Each day the app gets a bit better, a bit more polished. Just like in the days before AI. The biggest difference is that I can start introducing and using concepts and tools I have heard of and have only a vague understanding of. End-to-end encryption, PWA, Solid js. I had either only worked with these lightly or not at all. At the same time they were not completely alien to me in concept. But I can for sure see how using AI allowed me to ship faster (yes including days 5-10). The one thing preventing it from being truly production ready is its lack of any analytics. 


## Where I did step in
In terms of code the one place I really had to just do the work myself was in handling the interaction of sending on mobile. Because the submit button became hidden behind the virtual keyboard on mobile. I asked AI for a solution to move button up or shrink layout size when there is a virtual keyboard open but there isn't a great way to know this in Javascript. While it came up with some workarounds to get something working I had to write my own css to position the button correctly and my own js to toggle on and off the css based on focus/blur of textarea along with assuming a touch device has a virtual keyboard. For my app this is sufficient 


## Conclusion

It's incredible fun to build with claude code now. I think we might be at a point where creating with AI becomes as addicting as consuming short form video is. As with learning via instagram there is probably some cost to thinking with AI. So while I embrace it I'm also making sure to think without it by writing articles like this one

See the app at [paperhearts.aaronderuvo.com](https://paperhearts.aaronderuvo.com)