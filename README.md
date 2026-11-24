# Highfrequencytrader

Okay. Let's create an application called High Frequency Chess Bot. And the concept behind it is opening trades on MT5, MetaTrader 5, but it is not the MetaTrader 5. So, for demonstration purposes, I've created an application, but in another Lovable project. So, we'll find a way to link to that project. And the one that you are going to create... So, the one that I've created there is the trading bot itself over there, in the other Lovable project in another account. It is the one that trades. And in it, it simulates a demo. It simulates trades based on the user settings. So, in that app, I can go to settings and set the number of trades I want to simulate, and the load size, and the market where I want to simulate, and everything. Then I come back to... Then I start simulating. Now, this app, I want it to be the one guiding that, or to be the bot that will be for display to show how that works. So, in this, the one that we are creating now, it has to have a link with that other app. So, I don't know how we are going to establish that. But not that much detail link, because the only things that I want to be in link is when I come to this app, I will share the screenshots of how this one app that we are creating should look like. So, when we configure the settings, here we can change things like the brokers that should show on that other app, and we can be switching between them. So, in this app, the high frequency, when you switch between the broker, it should update there. Then we can update the logo in this app of, for example, a broker called Exness, for example. And I can type the name of the broker and type the account type, for example, Exness real account, something, whatever I type, then save. When I save, it communicates back to my original app and updates those settings. So, I can change things like that. And also, when I come here and maybe put to open six trades, like six trades here, then on this app that we're developing right now, I click on Start Bot, it should automatically open the trades in that other app. Though in that other app, there is a section of admin where I've put that option, where I go and type the settings, how many trades to open, at what time, the cooldown, and many other settings. Then I run the bot. But now, I want this one to be the one controlling that, besides the original app being able to do that. So, when I come and put the number of trades to open, and maybe, yeah, the number of trades to open, and change anything here in this app, it should reflect on my app. So, I'll just share the screenshots, and then use the same theme and everything, and follow everything systematically from the first screenshot downwards, or use common sense to see how they should follow each other based on how my screenshots look like. So, everything that appears in the screenshot should be a functionality, not just there being seen in the CSS. It should be functionable based on how it looks and the description in that, the information in that screenshot. So, basically, it's a remote. So, this is a remote for the other app to simulate the trades from here. So, when I click on Run Bot, or Run Bot, then I open the other app, it should behave as the settings that we have set here. So, tell me what you need. Also the prices shown and pair selection should be real prices from online API of markets

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://highfrequencytrader.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49e1e139-c63e-47ac-9d2e-c42a40ce4d88).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
