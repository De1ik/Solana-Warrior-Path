### Build and run the exploits
``` shell
cd ctf-breakpoint-2023
```
``` shell
anchor build
```
``` shell
yarn install
```
``` shell
anchor run exploit<n> # replace <n> by the number of the exploit
```


To solve the problem with `proc-macro2` dependencies run anchor with nightly compilator: 
```
RUSTUP_TOOLCHAIN=nightly-2025-04-01 anchor build
```
```
RUSTUP_TOOLCHAIN=nightly-2025-04-01 anchor run exploit<n>
```