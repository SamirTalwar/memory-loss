{ pkgs ? import <nixpkgs> {} }:
with pkgs;
mkShell {
  name = "memory-loss";

  buildInputs = [
    entr
    jq
    nodejs
  ];
}
