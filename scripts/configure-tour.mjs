import fs from "node:fs/promises";
const assets = JSON.parse(await fs.readFile("public/tour/assets.json", "utf8"));
const definitions = [
  {
    id: "cho-tranh",
    name: { vi: "Một phiên chợ tranh", en: "A painting market" },
    description: {
      vi: "Mô hình chợ đặt giữa gian trưng bày, bao quanh bởi tranh và những bảng tư liệu. Nhìn quanh để tìm các sạp hàng và đi tiếp đến khu công đoạn.",
      en: "A market diorama stands in the exhibition hall, surrounded by prints and information panels. Look around the stalls, then continue towards the craft displays.",
    },
    photo: "/images/visit/cho-tranh.webp",
    art: "dam-cuoi-chuot",
    artTitle: { vi: "Đám cưới chuột", en: "The rats’ wedding" },
    artText: {
      vi: "Một đoàn rước với kèn, trống và kiệu nối thành hai hàng. Hình ảnh những con vật mang dáng vẻ con người tạo nên câu chuyện sinh động. Mở trang tranh để nhìn rõ từng chi tiết.",
      en: "A procession with horns, drums and a palanquin forms two rows. Animals take on human roles in a lively story. Open the print to explore the details.",
    },
    yaw: 99,
    pitch: -9,
    initialYaw: 0,
    initialPitch: -12,
  },
  {
    id: "mau-va-giay",
    name: { vi: "Màu và nền giấy", en: "Colour and paper" },
    description: {
      vi: "Dọc gian phòng là mô hình chuẩn bị vật liệu và những giá tranh. Quan sát các bàn làm việc rồi so sánh mảng màu trên những bức tranh treo gần đó.",
      en: "Material-preparation dioramas and print stands line the hall. Look at the worktables and compare colour fields in the nearby prints.",
    },
    photo: "/images/visit/che-mau.webp",
    art: "vinh-hoa-phu-quy",
    artTitle: { vi: "Vinh hoa – Phú quý", en: "Vinh Hoa – Phu Quy" },
    artText: {
      vi: "Hai vế tranh đặt em bé bên gà trống và vịt. Những mảng màu và đường nét tròn tạo sự cân đối. Phóng to ảnh để so sánh cử chỉ, hoa và hai con vật.",
      en: "Two panels pair children with a rooster and a duck. Rounded lines and colour fields create balance. Enlarge the photograph to compare the gestures, flowers and birds.",
    },
    yaw: -25,
    pitch: -16,
    initialYaw: -35,
    initialPitch: -8,
  },
  {
    id: "ban-in",
    name: { vi: "Bên bàn in", en: "At the printing table" },
    description: {
      vi: "Mô hình người làm tranh đặt bên bàn in và các dụng cụ. Từ góc nhìn này, bạn có thể theo dõi gian trưng bày tranh ở phía trước và những công đoạn ở bên cạnh.",
      en: "Craft mannequins stand beside a printing table and tools. From here, look towards the print displays ahead and the process exhibits beside them.",
    },
    photo: "/images/visit/van-khac.webp",
    art: "dam-cuoi-chuot",
    artTitle: { vi: "Đám cưới chuột", en: "The rats’ wedding" },
    artText: {
      vi: "Hai bản tranh trên giá đứng cho thấy mô-típ đoàn rước của Đám cưới chuột. Nét đen phân chia từng nhân vật trong hai hàng. Xem phiên bản màu trong thư viện để đối chiếu bố cục.",
      en: "Two prints on the standing display show the procession motif of The rats’ wedding. Black outlines separate the figures into two rows. Compare the composition with the colour version in the collection.",
    },
    yaw: 15,
    pitch: 7,
    initialYaw: -55,
    initialPitch: -10,
  },
  {
    id: "phong-tranh",
    name: { vi: "Giữa những bức tranh", en: "Among the prints" },
    description: {
      vi: "Tranh treo, ván khắc và bảng ảnh tư liệu cùng xuất hiện trong góc phòng này. Tìm bức Hứng dừa trên tường và quan sát bố cục dọc của cây dừa.",
      en: "Wall prints, woodblocks and historical-photo panels share this corner. Find Catching coconuts on the wall and follow the palm’s vertical composition.",
    },
    photo: "/images/visit/tuong-tranh.webp",
    art: "hung-dua",
    artTitle: { vi: "Hứng dừa", en: "Catching coconuts" },
    artText: {
      vi: "Cây dừa dẫn mắt từ những tán lá xuống nhóm người bên dưới. Mỗi nhân vật có một động tác khác nhau. Mở trang chi tiết để xem ảnh dọc đầy đủ và phần chữ trên tranh.",
      en: "The palm guides the eye from its leaves to the figures below. Each person has a different gesture. Open the detail page to see the full vertical image and its inscription.",
    },
    yaw: -91,
    pitch: 20,
    initialYaw: -70,
    initialPitch: 12,
  },
];
const scenes = definitions.map((d, i) => {
  const source = assets.find(
    (a) =>
      a.source ===
      (i === 0 ? "sourceVR/1 .360.HEIC" : `sourceVR/${i + 1}.360.HEIC`),
  );
  if (!source?.variants) throw new Error("Missing panorama");
  const links = [
    ...(i > 0
      ? [
          {
            target: definitions[i - 1].id,
            name: definitions[i - 1].name,
            yaw: -25,
            pitch: -30,
          },
        ]
      : []),
    ...(i < 3
      ? [
          {
            target: definitions[i + 1].id,
            name: definitions[i + 1].name,
            yaw: 25,
            pitch: -30,
          },
        ]
      : []),
  ];
  return {
    ...d,
    panorama: source.variants,
    horizontalFov: 240,
    defaultYaw: d.initialYaw,
    defaultPitch: d.initialPitch,
    defaultZoom: 55,
    narration: { vi: null, en: null },
    links,
    hotspots: [
      {
        id: `art-${d.art}`,
        yaw: d.yaw,
        pitch: d.pitch,
        title: d.artTitle,
        description: d.artText,
        image: `/images/paintings/${d.art}.webp`,
        paintingSlug: d.art,
      },
    ],
  };
});
const result = {
  version: 1,
  title: { vi: "Đi một vòng, gặp Đông Hồ", en: "A journey through Dong Ho" },
  intro: {
    vi: "Bước vào không gian trưng bày. Đi từ chợ tranh, màu giấy đến ván khắc — và dừng lại ở những chi tiết bạn yêu thích.",
    en: "Step into the exhibition. Move from the painting market and materials to woodblocks, pausing at the details that catch your eye.",
  },
  start: scenes[0].id,
  backgroundAudio: null,
  scenes,
};
await fs.writeFile(
  "public/tour/tour.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  "Configured four supplied viewpoints with bilingual descriptions and linked painting details.",
);
