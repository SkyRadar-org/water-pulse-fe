/** Approximate label anchors for the provinces around the study area (names after the 2025 merger). */
export interface ProvinceLabel {
  name: string;
  lngLat: [number, number];
  country?: boolean;
}

export const PROVINCE_LABELS: ProvinceLabel[] = [
  { name: 'An Giang', lngLat: [105.0, 10.15] },
  { name: 'Đồng Tháp', lngLat: [105.75, 10.25] },
  { name: 'Tây Ninh', lngLat: [106.15, 11.3] },
  { name: 'Cần Thơ', lngLat: [105.6, 9.85] },
  { name: 'Vĩnh Long', lngLat: [106.1, 9.95] },
  { name: 'Cà Mau', lngLat: [105.0, 9.3] },
  { name: 'CAMBODIA', lngLat: [104.75, 11.3], country: true },
];
