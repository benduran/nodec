## 1.1.3 (2026-07-14)

### 🔀 Miscellaneous 🔀

- chore: add more CJS shims (b449c1acd7ee532bc3b3bd7b4da5191ace24b311)

---

## 1.1.2 (2026-07-14)

### 🛠️ Fixes 🛠️

- fix: namespace the createRequire import (c3562466162e62a91dcd0b74a3af7130c9b30c29)

---

## 1.1.1 (2026-07-14)

### ✨ Features ✨

- feat: automatically shim global require for esm builds (cd63fee82b8da4630963acc58d6812846e170c85)

---

## 1.1.0 (2026-07-14)

### ✨ Features ✨

- feat: add ability to emit non-minified JS code into the binary (d5098baa841897c1d85d373692c32090b127b742)

---

## 1.0.2 (2026-07-14)

### 🛠️ Fixes 🛠️

- fix: missed a file extension (46003263ec231eb31288d74958953e268e544eae)

---

## 1.0.1 (2026-07-14)

### 🔀 Miscellaneous 🔀

- chore: deps (343397ae0bc5e0d7a7c277028aa8f76b91444be0)

---

## 1.0.0 (2026-07-14)

### 🔀 Miscellaneous 🔀

- Merge pull request #5 from benduran/the-comeback (0c5649eb0e2e6bf41b6d99f4e96c5b5a7d2b52eb)
- chore: linting (37330e0ea647ddfc6ca18979b7ec4584bf32060c)
- chore: added some goodness from my other repo (44ab75a424d72f2f4ecda898860e8c391cea9064)
- chore: added test for flags passing and switchd to using mise in the action (875d1523da223771312b8638dba084d44b5292bf)
- chore: switch to npm in CI (1d69dea66dccbe3b24d3a04df795bacc58d42951)
- chore: reimagine nodec with security, modern tooling, CI, and tests (69e7d2390c5defcb4092b78cbf6d50d07d200ce3)
- Update README.md (7e47b49c1950cd081a1cee66e0033a69cc661e0d)



### 📖 Docs 📖

- docs: readme updates (f5f2805a87a98b3b47b7c9385d27bda98c4fdb2c)



### 🛠️ Fixes 🛠️

- fix: build (bc890e9fc8bd86185a415c65c934857105c73440)
- fix: make Windows node archive extraction work in CI (13385b198e3fc6bfae1de432f67afa6aa54a4968)
- fix: tests and arg handling (a560d2c528a5e045715b4241e33806c546ea33cd)

---

## 0.5.4 (2024-04-29)

### 🔀 Miscellaneous 🔀

- chore: simplified the gzip reader (2f3496295838069fcfb1d64c6a67ace32bdd26ae)

---

## 0.5.3 (2024-04-28)

### 🔀 Miscellaneous 🔀

- chore: updated conveinece release script (f5ed9e05e46d4fe6591b8fb75291286577ad5981)



### 📖 Docs 📖

- docs: corrected misinformation in the readme regarding the target flag (936b500495fd59914ddd56385137fe41a34fd0f8)

---

## 0.5.2 (2024-04-27)

### 🔀 Miscellaneous 🔀

- chore: removed bogus console log (c2238940af63f5465319e1104ee47a25ea167928)

---

## 0.5.1 (2024-04-27)

### 🛠️ Fixes 🛠️

- fix: wrong binfile (1427f86c6ebbc5b4c5fb6078cb4875afdff1db48)

---

## 0.5.0 (2024-04-27)

### 🔀 Miscellaneous 🔀

- Merge pull request #3 from benduran/bduran/flags-and-typescript (f8f4d87f1b3b9101a9ac0d3a711b59b3ad7a2631)
- chore: oops, left the poop file in (9d7f5a72be46115f836ade33d68ae591df87bb59)



### ✨ Features ✨

- feat: added support for setting node flags and switched js toolchain to typescript (5676669750d116a0765c3b89a83392f6175b6a04)

---

## 0.4.0 (2024-04-25)

### ✨ Features ✨

- feat: added minification of JS by default and fixed the order of flags presented in the help menu (a56152e4c26191d00290b2a58181cbf338c4a86d)

---

## 0.3.2 (2024-04-25)

### 🔀 Miscellaneous 🔀

- chore: moved err handling to be slightly more idiomatic (cd4e61e72fc49190ce6caf257128140b6be1d967)

---

## 0.3.1 (2024-04-24)

### 📖 Docs 📖

- docs: updated readme and added missing github repo link to package.json (07df932b3005dde7dd50649a129b8d4a3b82384b)

---

## 0.3.0 (2024-04-24)

### ✨ Features ✨

- feat: added app name in executing path for extracted, compiled binary contents (4e26998535e0cca583214faf9cc518613e2abbc9)

---

## 0.2.0 (2024-04-23)

### 🔀 Miscellaneous 🔀

- Merge pull request #2 from benduran/bduran/node-caching (fc1f3409b8b010d8932fbf4189e6d02ae9d9ea39)



### 📖 Docs 📖

- docs: updated readme to add a warning (30603be8e6a7ce7a763e346401127ae8e0ae87c6)



### ✨ Features ✨

- feat: added node download caching to speed up the compilation process (33a0f5deb971d523ebae3532a96800075f117adc)

---

## 0.1.8 (2024-04-23)

### 🛠️ Fixes 🛠️

- fix: fixed untarring on macos platforms (04d4181871173e4aebb2a491b3347f08042b3d28)

---

## 0.1.7 (2024-04-23)

### 🛠️ Fixes 🛠️

- fix: added missing prod dep (bb00d4ab30710018968a9d2c531286216d2d8357)

---

## 0.1.6 (2024-04-23)

### 🛠️ Fixes 🛠️

- fix: made binfile executable (7d00d2d4dc868832f20277809e36611d082a0b72)

---

## 0.1.5 (2024-04-23)

### 🛠️ Fixes 🛠️

- fix: added missing node shebang to binfile (388b42c200130bee7dfe3a0c53c5faf58f9634f7)

---

## 0.1.4 (2024-04-23)

### 🛠️ Fixes 🛠️

- fix: added cjs support and fixed some compilation paths (f58f149e605afcf49d57464e4573bc8dd1d609f5)

---

## 0.1.3 (2024-04-22)

### 🔀 Miscellaneous 🔀

- chore: lol jk, remove anything that's not a src file (788b0e1fa98cafcc251867df26dc6cf075f79d51)

---

## 0.1.2 (2024-04-22)

### 🛠️ Fixes 🛠️

- fix: removed zlib package that isn't used because node includes its own now (61c89608aa096e7057cd279a61423232622d0206)

---

## 0.1.1 (2024-04-22)

### 📖 Docs 📖

- docs: added keywords (b9160259975dc8c6a29fae63c3f1ea80afa93543)

---

## 0.1.0 (2024-04-22)

### 🔀 Miscellaneous 🔀

- chore: removed mac dir that snuck its way in (9c07cd365602e10d07d39467c15bb277d0058fda)
- chore: added release script for simplicity (2e01301e2fea79a5344e08dd207f5d2033a0ee6a)
- Merge pull request #1 from benduran/bduran/node-toolchain (6c67178ad4679ff576289f10dd7c3d61deb53326)
- chore: added license to the archive payload (999c3316ea390c28fc48e26ecc67ead5c0588f43)
- chore: updated package name and added docs (d363ec1c19a95447aa4e8b4ce47f3c7761f1718a)
- chore: added target suffix to compiled binary (3d2fde6b6378b8ef16fc6bdf811cfcb5fce085f9)
- chore: updated deps (7e5e19ca527953b848c24303532888f3ca3b8b3b)
- added husky and commit linting (b31ee9e399577ae47e1a228105d87fe4b188d2d6)
- chore: made more progress on swapping to nodejs compiling go :) (b71fa4e7da354fa25824f8558a91e8b01db95442)
- chore: added archive extraction for all the various node archives (660bfd50adb3d8b02092632c5ee1ef51287219ca)
- chore: started porting compilation toolchain to node (382a7081370029e8236426e697264325184d42a0)
- chore: build mostly works, but the JS isn't rendering (ff5b87601e7e9af9dfb54ecce149e722aeb78624)
- chore: added naming of the binary (91e1f99a67a4edf518a1bc4bf675592697c569ee)
- chore: always self-destruct the extracted version of node (10122918edf2a079ce221bbdbfe801e35b40b94c)
- chore: moved main cmd to root for easier compiling (0b12492d25548bdb34dda09a9530716dc7dd5134)
- chore: most of the pieces are there, just dealing with runtime node extraction issues (f5f0aa575803331470b4047c3f36882e007ac1ea)
- chore: added zip and tar.gz extraction. still need to work through getting the compiled node bin and using that, instead of the whole tar folder (a0da8fc89c5aaeaeca83b7b73b2e41cd31f4ecf5)
- chore: maded some additional tweaks to how node and the compiler are rendered to disk (d34fae6b55bb6985c42925a5b649ed421baf0771)
- chore: start of setting up compiler (ab0bb15dc5c4163f902f2a5ee431a387a07f4786)
- chore: added downloading node to tmp folder (72531f85452c8ee64a245c4a44b041f3d36e8d81)
- chore: added node download URL construction (0ad0d55b4c045a59de06b26214f4c032bc0b5e42)
- chore: added some basic CLI flag parsing (9b057f72ed9fc7c023d1efe19bc25f37e600716b)
- chore: initial main setup (cf28788ee4d9b49322d72dd171fa6fa1a85901c0)
- Initial commit (3dc5121f1e97dc910e8b0e24467c6c4ea5e8c572)



### 🛠️ Fixes 🛠️

- fix: fixed inflated node file name on windows to have .exe extension (f6006a0f8dea876a751224e1ec511aad4dd0cb3b)
- fix: fixed the windows build. runtime, however, is still broken (56ac76c57264a694e6468432c454451edbfb5028)
- fix: fixed self cleanup on certain SIG* events for the compiled binary (5313eb701f20f00f4a0e16dfb9d97fd0556da8b2)
- fix: fixed download folder not getting cleaned up after compilation (08f6cda95d8a95cc701f6e2ba1e18a5578b65933)
- fix: js is bundled and added embedding into the compiler (24b7f01c5576ecca432ffe9a4e6e635cadc68339)
- fix: fixed compilation to macos targets (ab14d3272dea88566e051e9b8bbc13bdb80873a9)



### ✨ Features ✨

- feat: node toolchain for compilation works, yay (71c4473831fb9aed7201401ec67ed85e14ec2992)
- feat: sample app for testing compilation (d7ed71a896a0b3433cc698d2191a547f2b3021d5)
- feat: awesome, the whole thing works (30813010e69a053b8dd7141979195980873f0b55)
- feat: added gzip compression of the noderuntime that is embedded (dc7c5472874a94428f11e650273100ddcc5aafcc)
- feat: added node downloading (d9b5da39206c244c818638504b12bca3a5484996)

---

