<template>
  <div class="content">
    <HomeTitle />
    <div class="detailsDIV">
      <Suspense>
        <template #default>
          <PersonalIntroductions />
        </template>
        <template #fallback></template>
      </Suspense>
    </div>

    <div class="contactsDIV">
      <Suspense>
        <template #default>
          <ContactInformation />
        </template>
        <template #fallback></template>
      </Suspense>
    </div>

    <Suspense>
      <template #default>
        <MyFriends />
      </template>
      <template #fallback></template>
    </Suspense>
  </div>
</template>

<script lang="ts" setup>
import HomeTitle from "@/components/homeTitle.vue";
import PersonalIntroductions from "@/components/personalIntroduction.vue";
import ContactInformation from "@/components/contactInformation.vue";
import MyFriends from "@/components/myFriends.vue";
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
