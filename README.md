### Running backend dev environment

First, you need a Alacrity instance running in debug mode, this can be a remote server, a VM on your local machine,
or your local machine itself. Needless to say, Docker Engine is required version 28.5.2. Ubuntu is the best dev environment for Alacrity.

Log in to your machine, clone the git repo and run the following lines:

#### On Linux and Windows

```bash
$   npm install
$   npm run build
$   sudo ./dev-scripts/dev-clean-run-as-dev.sh
```

You are good to go! You can run the following line to see the logs for the back-end service.

```bash
npm run dev
```

### Backend development:

Start the debug build for the backend service as explained above. To see any changes you make,
first save the changes, then you need to restart the service either by sending a request to `/force-exit` endpoint,
or by running `npm run dev`.