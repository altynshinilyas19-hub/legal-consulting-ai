const LOCAL_LAWYER_IMAGES = [
  "/images/lawyer-placeholder-1.svg",
  "/images/lawyer-placeholder-2.svg",
  "/images/lawyer-placeholder-3.svg",
];

export function resolveLawyerPhotoSrc(photoUrl: string | null | undefined, lawyerId?: number | null) {
  const isRemoteUrl = typeof photoUrl === "string" && /^https?:\/\//i.test(photoUrl);
  if (photoUrl && !isRemoteUrl) {
    return photoUrl;
  }

  const fallbackIndex =
    typeof lawyerId === "number" ? Math.abs(lawyerId) % LOCAL_LAWYER_IMAGES.length : 0;

  return LOCAL_LAWYER_IMAGES[fallbackIndex];
}
