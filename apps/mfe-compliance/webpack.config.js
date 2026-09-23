const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { container } = require("webpack");
const { version: reactVersion } = require("react/package.json");
const { version: reactDomVersion } = require("react-dom/package.json");

const REMOTE_NAME = "swift_compliance_mfe";

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";

  return {
    entry: "./src/index.tsx",
    devtool: isProd ? "source-map" : "eval-source-map",
    resolve: { extensions: [".tsx", ".ts", ".js"] },
    module: {
      rules: [{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ }],
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash].js",
      publicPath: "auto",
      clean: true,
    },
    devServer: {
      port: 4002,
      headers: { "Access-Control-Allow-Origin": "*" },
      static: { directory: path.resolve(__dirname, "public") },
    },
    plugins: [
      new container.ModuleFederationPlugin({
        name: REMOTE_NAME,
        filename: "remoteEntry.js",
        exposes: {
          "./Widget": "./src/App.tsx",
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: "^16.14.0",
            strictVersion: false,
            eager: false,
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^16.14.0",
            strictVersion: false,
            eager: false,
          },
        },
      }),
      new HtmlWebpackPlugin({ template: "./public/index.html" }),
    ],
  };
};

module.exports.REMOTE_NAME = REMOTE_NAME;
