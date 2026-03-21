<template>
  <div class="homeContent">
    <h1 aria-hidden="false" class="sr-only">
      {{ globalWebTitleMap["home"]?.[lang] }}
    </h1>
    <HomeTitle />
    <div class="detailsDIV">
      <PersonalIntroductions />
    </div>
    <div>
      <ContactInformation />
    </div>
    <MyFriends />
  </div>
</template>

<script setup lang="ts">
import HomeTitle from "@/components/home/homeTitle.vue";
import PersonalIntroductions from "@/components/home/personalIntroduction.vue";
import ContactInformation from "@/components/home/contactInformation.vue";
import MyFriends from "@/components/home/myFriends.vue";
import { globalWebTitleMap } from "@/components/ts/global/useGlobalState.ts";
import { lang } from "@/components/ts/global/setupLang.ts";
</script>

<style lang="scss">
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
.homeContent {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;

  .detailsDIV {
    width: 100%;
    display: flex;
    justify-content: center;
  }
}
</style>
