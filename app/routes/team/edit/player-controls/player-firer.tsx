// import { fire } from "./actions";

type Props = {
  id: string;
};

export default function PlayerFirer({ id }: Props) {
  // const { execute, status } = useAction(fire, {
  //   onSuccess() {
  //     router.refresh();
  //   },
  // });

  // if (status === "executing") return <>Firing...</>;
  //
  // if (status === "hasErrored") return <>Failed to fire player</>;

  return (
    <button
      className="btn btn-outline btn-secondary btn-sm"
      // onClick={() => execute({ playerId: id })}
    >
      Fire!
    </button>
  );
}
