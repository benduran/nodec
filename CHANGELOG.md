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
