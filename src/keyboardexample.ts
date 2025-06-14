import { KeyboardBuilder, KeyboardButton, MessageContext } from "vk-io";

const { VK, Keyboard } = require("vk-io");
const { HearManager } = require("@vk-io/hear");

const builder: KeyboardBuilder = Keyboard.builder();
builder.inline(true);

const vk = new VK({
  token: process.env.TOKEN,
});

const hearManager = new HearManager();

vk.updates.on("message_new", (context: MessageContext, next) => {
  const { messagePayload } = context;

  context.state.command =
    messagePayload && messagePayload.command ? messagePayload.command : null;

  return next();
});

vk.updates.on("message_new", hearManager.middleware);

// Simple wrapper for commands
const hearCommand = (name, conditions, handle) => {
  if (typeof handle !== "function") {
    handle = conditions;
    conditions = [`/${name}`];
  }

  if (!Array.isArray(conditions)) {
    conditions = [conditions];
  }

  hearManager.hear(
    [(text, { state }) => state.command === name, ...conditions],
    handle,
  );
};

// Handle start button
hearCommand("start", "/start", (context, next) => {
  context.state.command = "help";
  console.log(next);
  const [, displayName] = context.$match;
  console.log(displayName);

  return Promise.all([context.send("Hello!"), next()]);
});

hearCommand("help", "/help", async (context) => {
  await context.send({
    message: `
            My commands list

            /help - The help
            /time - The current date
            /cat - Cat photo
            /purr - Cat purring
        `,
    keyboard: Keyboard.builder()
      .inline(true)
      .textButton({
        label: "The help",
        payload: {
          command: "help",
        },
      })
      .row()
      .row()
      .textButton({
        label: "Cat photo",
        payload: {
          command: "cat",
        },
        color: Keyboard.PRIMARY_COLOR,
      })
      .textButton({
        label: "Cat purring",
        payload: {
          command: "purr",
        },
        color: Keyboard.PRIMARY_COLOR,
      }),
  });
});

hearCommand("cat", "/cat", async (context) => {
  await Promise.all([
    context.send("Wait for the uploads awesome 😻"),

    context.sendPhotos({
      value: "https://loremflickr.com/400/300/",
    }),
  ]);
});

hearCommand("time", ["/time", "/date"], async (context) => {
  await context.send(String(new Date()));
});

const catsPurring = [
  "http://ronsen.org/purrfectsounds/purrs/trip.mp3",
  "http://ronsen.org/purrfectsounds/purrs/maja.mp3",
  "http://ronsen.org/purrfectsounds/purrs/chicken.mp3",
];

hearCommand("purr", "/purr", async (context) => {
  const link = catsPurring[Math.floor(Math.random() * catsPurring.length)];

  await Promise.all([
    context.send("Wait for the uploads purring 😻"),

    context.sendAudioMessage({
      value: link,
    }),
  ]);
});

vk.updates.start().catch(console.error);
