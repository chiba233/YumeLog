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

<script lang="ts" setup>
import HomeTitle from "@/features/home/components/homeTitle.vue";
import PersonalIntroductions from "@/features/home/components/personalIntroduction.vue";
import ContactInformation from "@/features/home/components/contactInformation.vue";
import MyFriends from "@/features/home/components/myFriends.vue";
import { globalWebTitleMap } from "@/shared/lib/app/useGlobalState.ts";
import { lang } from "@/shared/lib/app/setupLang.ts";
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
