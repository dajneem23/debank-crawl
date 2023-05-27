# Debank crawler

# Prerequisites 

To build and run this app you will need a few things:

1. **Install [Node.js](https://nodejs.org/en/) version `16.13.0 LTS`**
   > Or you can use [nvm](https://github.com/nvm-sh/nvm) to quickly install and use different versions of node via the command line

```shell
$ nvm install lts/gallium
$ nvm use lts/gallium

# Check version
$ node -v
v16.13.0
```

2. **Install [Yarn](https://yarnpkg.com/)**

```shell
# Check version
$ yarn -v
1.22.15
```

# Local Development

- **Install dependencies**

```shell
$ yarn
# Or
$ yarn install
```

- **Set the environment variables**

```shell
# Create local env
$ cp env.example.json env.local.json

# Open "env.local.json" and modify the env variables
```

- **Start server**

```shell
$ yarn dev
```

# install puppeteer

```shell
 node ./node_modules/puppeteer/install.js
```

Happy coding! 🥂

# Testing

Updating.....

# Deployment

Updating...............

# Portainer

(()=>{
const data=[]
const rows = document.querySelectorAll('tr[role="row"]');
for(let row of rows){
if(row.rowIndex==0 || row.rowIndex== rows.lenght-1)continue;
console.log({row})
const address=row.childNodes[0].childNodes[0].dataset?.bsTitle;
const name =row.childNodes[1].innerText;
data.push({address,name})
}
console.log(JSON.stringify(data))
})()
