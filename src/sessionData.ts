import { actionData } from "./interfaces";

class ChampionSelectSession {
    // pick phase actions: [2:..]
    data:any;
    localPlayerCellId:number;
    constructor(sessionData:any){
        this.data = sessionData
        this.localPlayerCellId = this.data.localPlayerCellId;
    }

    updateSessionData (newSessionData:any) {
        this.data = newSessionData
        this.localPlayerCellId = newSessionData.localPlayerCellId
    }

    async myTeamData() {
        return this.data.myTeam[this.localPlayerCellId]
    }


    async isPlayerBanTurn() {}



    async isBannable(championIds:number[],disabledChamps:number[]=[]){
        /**
         * Checks to see which champion in the list isn't hovered by teammates or is bannable
         * @return {champId:number} - The champion Id that is bannable
         */
        const noBans:number[] = [];
        const hoveredChampions = await this.HoveredChampions()
        noBans.push(...this.data.bans.myTeamBans)
        noBans.push(...this.data.bans.theirTeamBans)
        noBans.push(...disabledChamps)
        noBans.push(...hoveredChampions)
        for (const champId of championIds) {
            if (!noBans.includes(champId)) {
                return champId
            }
        }
    }




    async HoveredChampions() {
        let champions:number[] = []
        for (const player of this.data.myTeam) {
            if (player.championPickIntent !== 0) champions.push(player.championPickIntent)
        }
        return champions
    }
    async myPosition() {
        const teamData = await this.myTeamData()
        return teamData.assignedPosition
    }

    async banData() {
        for (const action of this.data.actions[0]) {
            if (action.actorCellId === this.localPlayerCellId) {
                return action                
            }
        }
    }

    async pickActionData() {
        const data  = this.data
        for (const actionsArrays of data.actions) {
            for (const action of actionsArrays){
                if (!action.completed && action.actorCellId === data.localPlayerCellId && action.type === 'pick'){
                    return action
                }
            }
        }
    }


    async banActionData() {
        const data = this.data;
        for (const actionsArrays of data.actions) {
            for (const action of actionsArrays){
                if (!action.completed && action.actorCellId === data.localPlayerCellId && action.type === 'ban'){
                    return action
                }
            }
        }
    }


    async currentActionData(){
        /**
         * returns the localPlayer's action data that is currently incomplete or active
         * @return {actionData}
         */
        let actions = this.data.actions;
        let data;
        for (let actionIndex=0; actionIndex< actions.length; actionIndex++) {
            for (let innerIndex=0; innerIndex < actions[actionIndex].length; innerIndex++) {
                data=actions[actionIndex][innerIndex]
                if (data.actorCellId === this.localPlayerCellId && !data.completed) {
                    return data
                }
                
            }
        }
        return false;
    }


}



export {ChampionSelectSession}