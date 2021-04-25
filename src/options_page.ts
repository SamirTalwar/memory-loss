(async () => {
  const options = await import("./options");

  const currentOptions = await options.get();

  const limitSelector = document.querySelector("[name=limit]")!;
  for (const {description, value} of options.COOKIE_LIMIT_OPTIONS) {
    const optionElement = document.createElement("option");
    optionElement.value = value.toString();
    optionElement.textContent = description;
    if (value === currentOptions.cookieLimitInSeconds) {
      optionElement.selected = true;
    }
    limitSelector.appendChild(optionElement);
  }

  limitSelector.addEventListener("change", (event) => {
    const cookieLimitInSeconds = parseInt(
      (event.target as HTMLSelectElement).value,
    );
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
