<template>
  <div class="dashboardTitle">
    <n-avatar :src="icon" bordered class="titleIcon" round></n-avatar>
    <a class="titleText">
      {{ displayTitle }}
    </a>
    <div class="a"></div>
  </div>
</template>

<script lang="ts" setup>
import { NAvatar } from "naive-ui";
import icon from "../icons/icon.webp";
import { useYamlText } from "@/components/ts/useYamlI18n.ts";

const displayTitle = useYamlText("main", "title.yaml", "title");
</script>

<style lang="scss">
.dashboardTitle {
  display: flex;
  margin-bottom: 0.5em;
  margin-top: 4rem;
  @media (min-width: 840px) {
    flex-direction: row;
    justify-content: center;
  }
  @media (max-width: 840px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  @media (max-width: 430px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .titleText {
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    color: white;
    text-align: center;
    text-shadow:
      #383838 1px 0 0,
      #383838 0 1px 0,
      #383838 -1px 0 0,
      #383838 0 -1px 0;
    font-weight: lighter;
    @media (min-width: 840px) {
      font-size: 1.9em;
      margin-left: 1.5em;
    }
    @media (max-width: 840px) {
      padding-top: 0.5em;
      font-size: 1.7em;
    }
  }

  .titleIcon {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    @media (min-width: 380px) {
      display: flex;
      width: 6em;
      height: 6em;
      flex-shrink: 0;
    }
    @media (max-width: 380px) {
      display: flex;
      width: 4em;
      height: 4em;
      flex-shrink: 0;
    }
  }

  .a {
    display: none;
    @media (min-width: 730px) {
      width: 6em;
      height: 6em;
    }
  }
}
</style>
