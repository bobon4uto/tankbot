import { toUSVString } from "util";
import { KeyboardBuilder, KeyboardButton, MessageContext } from "vk-io";

const { VK, Keyboard } = require("vk-io");
const { HearManager } = require("@vk-io/hear");

const TO_ME: RegExp = RegExp(process.env.TO_ME_REGEX);
const vk = new VK({
  token: process.env.TOKEN,
});
console.log(vk);
const hearManager = new HearManager();

type Button = {
  label: string;
  command: string;
  color;
};

vk.updates.on("message_new", (context: MessageContext, next) => {
  const { messagePayload } = context;
  console.log(messagePayload);
  context.state.command =
    messagePayload && messagePayload.command ? messagePayload.command : null;

  return next();
});

vk.updates.on("message_new", hearManager.middleware);

// Simple wrapper for commands
const hearCommand = (name, conditions, handle) => {
  if (typeof handle !== "function") {
    handle = conditions;
    conditions = [`!${name}`];
  }

  if (!Array.isArray(conditions)) {
    conditions = [conditions];
  }

  hearManager.hear(
    [(text, { state }) => state.command === name, ...conditions],
    handle,
  );
};
async function IDtoName(userID: number) {
  const users = await vk.api.call("users.get", {
    user_ids: userID,
  });
  return users[0].first_name + " " + users[0].last_name;
}

//hearManager.hear(RegExp(""), async (context: MessageContext) => {
async function testreply(context: MessageContext) {
  await context.send(
    "Вы, " + (await IDtoName(context.senderId)) + " написали: " + context.text,
  );
}
//});

hearManager.hear(RegExp(""), figure_out);
async function figure_out(context: MessageContext) {
  if (TO_ME.test(context.text)) {
    await testreply(context);
    if (/!k/.test(context.text)) {
      const buttons = [];
      for (var i = 0; i < 9; i++) {
        const butt: Button = {
          label: "Сказать привет" + i,
          command: "privet",
          color: Keyboard.PRIMARY_COLOR,
        };

        buttons.push(butt);
      }
      console.log(buttons[0]);
      send_reply_with_keyboard(
        context,
        `
		команды:
			пока нету.
		`,
        buttons,
        6,
        1,
      );
    }
  }
  //console.log(context);
}

async function send_reply_with_keyboard(
  context: MessageContext,
  message: string,
  buttons: Array<Button>,
  max_row: number,
  max_col: number,
) {
  if (buttons.length > max_row * max_col) {
    while (buttons.length > max_row * max_col) {
      const curr_buttons: Array<Button> = buttons.slice(0, max_row * max_col);
      await context.send(
        await create_reply_with_keyboard(
          message,
          curr_buttons,
          max_row,
          max_col,
        ),
      );
      buttons = buttons.slice(max_row * max_col, buttons.length);
    }
    await context.send(
      await create_reply_with_keyboard("&#4448;", buttons, max_row, max_col),
    );
  } else {
    await context.send(
      await create_reply_with_keyboard(message, buttons, max_row, max_col),
    );
  }
}

async function create_reply_with_keyboard(
  message: string,
  buttons: Array<Button>,
  max_row: number,
  max_col: number,
) {
  return {
    message: message,
    keyboard: create_keyboard(buttons, max_row, max_col),
  };
}

function create_keyboard(
  buttons: Array<Button>,
  max_row: number,
  max_col: number,
) {
  var keyboard = Keyboard.builder().inline(true);
  var colcounter: number = 0;

  for (const button of buttons as Array<Button>) {
    add_button(keyboard, button);
    colcounter++;
    if (colcounter >= max_col) {
      keyboard.row();
      colcounter = 0;
    }
  }
  return keyboard;
}

function add_button(keyboard: KeyboardBuilder, button: Button) {
  keyboard.textButton({
    label: button.label,
    payload: {
      command: button.command,
    },
    color: button.color,
  });
}

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
        label: "",
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

hearCommand("privet", "/privet", async (context) => {
  await Promise.all([
    context.send("Здравия желаю"),

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
