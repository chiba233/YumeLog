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
