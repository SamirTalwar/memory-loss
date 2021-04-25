(async () => {
  const options = await import("./options");

  const limitSelector = document.querySelector("[name=limit]")!;

  await (async () => {
    const currentOptions = await options.get();

    var selected = false;
    for (const {description, value} of options.COOKIE_LIMIT_OPTIONS) {
      const optionElement = document.createElement("option");
      optionElement.value = value.toString();
      optionElement.textContent = description;
      if (value === currentOptions.cookieLimitInSeconds) {
        selected = true;
        optionElement.selected = true;
      }
      limitSelector.appendChild(optionElement);
    }

    const foreverOptionElement = document.createElement("option");
    foreverOptionElement.value = "";
    foreverOptionElement.textContent = "forever";
    if (!selected) {
      foreverOptionElement.selected = true;
    }
    limitSelector.appendChild(foreverOptionElement);
  })();

  limitSelector.addEventListener("change", (event) => {
    const cookieLimitValue = (event.target as HTMLSelectElement).value;
    const cookieLimitInSeconds =
      cookieLimitValue.length > 0 ? parseInt(cookieLimitValue) : undefined;
    options.set({
      cookieLimitInSeconds,
    });
  });
})().catch((error) => {
  if (error instanceof Error) {
    document.body.textContent = `Error: ${error.message}`;
  } else {
    document.body.textContent = `Error: ${error}`;
  }
});
