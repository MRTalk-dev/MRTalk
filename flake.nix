{
  description = "Python Shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.python312
            pkgs.uv
            pkgs.pnpm
            pkgs.nodejs_24
            pkgs.claude-code
          ];
          shellHook = ''
            echo "uv version: $(uv --version)"
            echo "python version: $(python --version)"
          '';
        };
      }
    );
}
