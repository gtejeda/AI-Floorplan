const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/*.node',
    },
    prune: false, // Don't remove node_modules
    name: 'MicroVillas Investment Platform',
    executableName: 'microvillas',
    appBundleId: 'com.microvillas.investment-platform',
    appCategoryType: 'public.app-category.business',
    // icon: path.join(__dirname, 'public/assets/icon'), // Uncomment when icon is created
    win32metadata: {
      CompanyName: 'MicroVillas Team',
      FileDescription: 'MicroVillas Investment Platform',
      ProductName: 'MicroVillas Investment Platform',
      InternalName: 'MicroVillas',
      OriginalFilename: 'microvillas.exe'
    },
    osxSign: {
      identity: process.env.APPLE_IDENTITY || undefined,
      'hardened-runtime': true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      'signature-flags': 'library'
    },
    osxNotarize: process.env.APPLE_ID ? {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    } : undefined
  },
  rebuildConfig: {
    // Force rebuild of native modules for Electron
    force: true,
  },
  hooks: {
    postPackage: async (forgeConfig, options) => {
      const fs = require('fs-extra');
      const path = require('path');

      console.info('Copying external modules with dependencies...');

      // Recursive function to copy a module and its dependencies
      async function copyModuleWithDeps(moduleName, targetRoot, copied = new Set()) {
        if (copied.has(moduleName)) {
          return; // Already copied
        }
        copied.add(moduleName);

        const sourcePath = path.join(__dirname, 'node_modules', moduleName);
        const targetPath = path.join(targetRoot, moduleName);

        if (!fs.existsSync(sourcePath)) {
          console.warn(`  Warning: ${moduleName} not found`);
          return;
        }

        console.info(`  Copying ${moduleName}...`);
        await fs.copy(sourcePath, targetPath);

        // Read package.json to get dependencies
        const pkgJsonPath = path.join(sourcePath, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
          if (pkgJson.dependencies) {
            for (const dep of Object.keys(pkgJson.dependencies)) {
              await copyModuleWithDeps(dep, targetRoot, copied);
            }
          }
        }
      }

      const outputPaths = options.outputPaths;
      for (const outputPath of outputPaths) {
        const asarPath = path.join(outputPath, 'resources', 'app.asar');

        // If ASAR exists, create node_modules next to it
        if (fs.existsSync(asarPath)) {
          const modulesToCopy = ['better-sqlite3', 'electron-store', 'sharp'];
          const targetNodeModules = path.join(outputPath, 'resources', 'node_modules');

          for (const moduleName of modulesToCopy) {
            await copyModuleWithDeps(moduleName, targetNodeModules);
          }
        }
      }

      console.info('External modules copied successfully!');
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'MicroVillas',
        authors: 'MicroVillas Team',
        description: 'Professional desktop application for Micro Villas real estate investment analysis',
        exe: 'microvillas.exe',
        setupExe: 'MicroVillasSetup.exe',
        // setupIcon: path.join(__dirname, 'public/assets/icon.ico'), // Uncomment when icon is created
        // loadingGif: path.join(__dirname, 'public/assets/install-spinner.gif'), // Optional
        // iconUrl: 'https://raw.githubusercontent.com/yourusername/ai-floorplan/main/public/assets/icon.ico',
        noMsi: true
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'MicroVillas Investment Platform',
        // icon: path.join(__dirname, 'public/assets/icon.icns'), // Uncomment when icon is created
        // background: path.join(__dirname, 'public/assets/dmg-background.png'), // Optional
        format: 'ULFO',
        window: {
          size: {
            width: 660,
            height: 400
          }
        },
        contents: [
          {
            x: 180,
            y: 170,
            type: 'file'
          },
          {
            x: 480,
            y: 170,
            type: 'link',
            path: '/Applications'
          }
        ]
      },
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main/index.ts',
            config: 'vite.main.config.ts',
          },
          {
            entry: 'src/preload/index.ts',
            config: 'vite.preload.config.ts',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
        ],
      },
    },
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false, // Disabled to allow unpacked modules
      [FuseV1Options.OnlyLoadAppFromAsar]: false, // Allow loading unpacked native modules
    }),
  ],
};
