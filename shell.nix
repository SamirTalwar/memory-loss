{ pkgs ? import ./nix/pkgs.nix }:
with pkgs;
mkShell {
  name = "memory-loss";

  buildInputs = [
    entr
    geckodriver
    jq
    nodejs
  ];
}
