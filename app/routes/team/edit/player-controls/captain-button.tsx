type Props = {
  playerId: string;
  disabled: boolean;
};

export default function CaptainButton({ playerId, disabled }: Props) {
  return (
    <button
      className="btn"
      onClick={async () => {
        // await makeCaptain({ playerId });
        // router.refresh();
      }}
      disabled={disabled}
    >
      Make Captain
    </button>
  );
}
