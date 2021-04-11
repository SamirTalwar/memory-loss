let
  overlay = self: super: {
    geckodriver = super.callPackage ./geckodriver { };
  };
in
import <nixpkgs> { overlays = [ overlay ]; }
