<template>
  <div class="content">
    <HomeTitle />
    <div class="detailsDIV">
      <PersonalIntroductions />
    </div>
    <div class="contactsDIV">
      <ContactInformation />
    </div>
    <Suspense>
      <MyFriends />
    </Suspense>
  </div>
</template>

<script lang="ts" setup>
import HomeTitle from "@/components/homeTitle.vue";
import PersonalIntroductions from "@/components/personalIntroduction.vue";
import ContactInformation from "@/components/contactInformation.vue";
import MyFriends from "@/components/myFriends.vue";
import { computed, onMounted } from "vue";
import { globalWebTitleMap } from "@/components/ts/useTitleState.ts";
import { useHead } from "@unhead/vue";
import { useRoute } from "vue-router";
import commonI18n from "@/data/I18N/commonI18n.json";
import { lang } from "@/components/ts/setupLang";
import { $message } from "@/components/ts/msgUtils";

const route = useRoute();
onMounted(() => {
  if (route.query.invalid) {
    const i18nSource = commonI18n.invalidAccess as Record<string, string>;
    const warningMsg = i18nSource[lang.value] || i18nSource["en"];

    $message.warning(warningMsg, true, 4000);
  }
});

useHead({
  title: computed(() => {
    const currentLang = lang.value;
    return globalWebTitleMap.value["home"]?.[currentLang] || "Home";
  }),
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
