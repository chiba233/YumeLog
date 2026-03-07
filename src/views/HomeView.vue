<template>
  <div class="content">
    <HomeTitle />
    <div class="detailsDIV">
          <PersonalIntroductions />
    </div>
    <div class="contactsDIV">
          <ContactInformation />
    </div>
        <MyFriends />
  </div>
</template>

<script lang="ts" setup>
import HomeTitle from "@/components/homeTitle.vue";
import PersonalIntroductions from "@/components/personalIntroduction.vue";
import ContactInformation from "@/components/contactInformation.vue";
import MyFriends from "@/components/myFriends.vue";
import { onMounted, shallowRef, watch } from "vue";
import { lang } from "@/components/ts/useStoage.ts";


type WebTitleMap = Record<string, Record<string, string>>;
const newWebTitle = shallowRef<WebTitleMap | null>(null);

const updatePageTitle = () => {
  if (!newWebTitle.value) return;
  const currentLang = lang.value;
  document.title = newWebTitle.value["home"]?.[currentLang] || "Default Title";
};

watch([lang, newWebTitle], () => {
  updatePageTitle();
}, { immediate: true });

onMounted(async () => {
  await fetch("/data/main/webTitle.json")
    .then(res => res.json())
    .then((data: WebTitleMap) => {
      newWebTitle.value = data;
    });
});
</script>

<style lang="scss">
.content {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;

  .contactsDIV {
    @media (min-width: 730px) {
      margin: 0.95em;
    }
  }

  .detailsDIV {
    width: 100%;
    display: flex;
    justify-content: center;
  }
}
</style>
