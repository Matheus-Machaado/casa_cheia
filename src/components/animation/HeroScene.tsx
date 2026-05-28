interface Props {
  brideName: string;
}

export default function HeroScene(props: Props) {
  void props.brideName;
  return (
    <div class="relative w-full h-full overflow-hidden">
      <img
        src="/animation/before.png"
        alt="Apartamento da Lina"
        class="absolute inset-0 w-full h-full object-cover object-bottom"
        loading="eager"
      />
    </div>
  );
}
