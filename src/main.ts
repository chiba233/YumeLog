import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./assets/main.css";
import { createHead } from "@unhead/vue/client";

const app = createApp(App);

app.use(createHead());
app.use(router);

app.mount("#app");
