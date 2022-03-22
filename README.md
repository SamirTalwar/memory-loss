# Memory Loss

_Memory Loss_ persuades your browser to forget things over time.

Just like we do.

## Limit cookie expiry time

_Memory Loss_ can limit the expiry time of cookies.

Often, servers will send cookies with instructions to keep them years or decades into the future. This can mean that if you visit a site, then visit again a year later, they can tie those visits together.

If you select a limit, all cookies sent by servers with an expiry time greater than the limit will have their expiry time overriden to the limit.

For example, if you select a limit of "1 month", and then visit Your Favorite Social Network™, the cookie that keeps you signed in will be forced to expire after 1 month, even if the social network sets the expiry time to years in the future.

## To Do

- [x] Limit cookies to a week.
- [x] Make the maximum cookie expiry time customizable.
- [x] Prompt the user to configure the extension on installation.
- [x] Provide a button to overwrite cookie expiry times for pre-existing cookies.
- [ ] Limit cookies set in JavaScript, as opposed to headers.
- [ ] Optionally overwrite cookie expiry times for pre-existing cookies on startup.
- [ ] Optionally wipe session cookies on startup.
- [ ] Customize the maximum cookie expiry time per domain.
- [ ] Test on Google Chrome.
- [ ] Test with first-party isolation.
- [ ] Add options for configuring various hidden cookie settings in `privacy.websites`:
  - [ ] `cookieConfig`
  - [ ] `firstPartyIsolate`
  - [ ] `resistFingerprinting`
  - [ ] `thirdPartyCookiesAllowed`
  - [ ] `trackingProtectionMode`
