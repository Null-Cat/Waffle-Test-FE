module.exports = {
  apps: [
    {
      name: "FE Waffle Test",
      script: "index.js",

      cwd: "/var/www/fewaffle/current",
      error_file: "/var/www/fewaffle/logs/web.err.log",
      out_file: "/var/www/fewaffle/logs/web.out.log",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],

  deploy: {
    production: {
      user: "phro",
      host: "deploy.philipwhite.dev",
      port: "2222",
      ref: "origin/main",
      repo: "git@github.com:Null-Cat/Waffle-Test-FE.git",
      fetch: "all",
      path: "/var/www/fewaffle",
      "post-setup": "ls -la",
      "post-deploy":
        "sudo npm install && sudo npm run build && sudo pm2 reload ecosystem.config.js --env production",
    },
  },
};
